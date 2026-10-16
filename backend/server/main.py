"""Local FastAPI server: wires the neuroscope pipeline to the browser frontend.

Upload the four sequences, run the same validate -> preprocess -> infer ->
write pipeline predict.py uses on the CLI, and hand the result back to the
browser as the binary payload its existing meshing/slice viewer already
expects. Loopback-oriented: one study processes at a time, nothing is sent
to a third-party service, and uploads are deleted as soon as a result exists.
"""

from __future__ import annotations

import asyncio
import contextlib
import datetime
import html
import json
import os
import shutil
import sys
import threading
import time
from pathlib import Path

import nibabel as nib
import numpy as np
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from starlette.concurrency import run_in_threadpool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from neuroscope import DISCLAIMER, __version__
from neuroscope import nifti_io as nio
from neuroscope.infer import HeuristicSegmenter, Segmenter, load_segmenter, stack_channels
from neuroscope.limits import MAX_INFERENCE_VOXELS, BudgetExceeded, check_voxel_budget
from neuroscope.provenance import git_commit, sha256
from neuroscope.regions import regions_to_label, score_all, volumes_all
from neuroscope.validate import SEQUENCES, validate_label, validate_study
from server.viewer import prepare_viewer

ROOT = Path(__file__).resolve().parents[1]
JOBS = Path(os.environ.get("NEUROSCOPE_JOB_DIR", str(ROOT / ".runtime" / "jobs")))
JOBS.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 1024**3  # 1 GB per file, matches the validator's own limit
RETENTION_SECONDS = 23 * 3600
busy = threading.Lock()

# In-memory pipeline-stage tracker so the browser can show real progress
# (validating / resampling / segmenting / meshing / reporting) during the one
# in-flight request, instead of a spinner with no information for ~30-90s.
# Polled, not pushed — simplest thing that works for one local demo machine.
_progress_lock = threading.Lock()
PROGRESS: dict[str, dict] = {}

STAGES = {
    "received": "Upload received, validating…",
    "validating": "Checking geometry, orientation and anatomy…",
    "resampling": "Reorienting and resampling onto the working grid…",
    "segmenting": "Running 3D segmentation — this is the slow step…",
    "measuring": "Computing region volumes and expert-mask metrics…",
    "meshing": "Building the display grid and binary payload for the viewer…",
    "reporting": "Writing the provenance report…",
    "done": "Complete.",
}


def report_stage(job: str, stage: str) -> None:
    with _progress_lock:
        PROGRESS[job] = {"stage": stage, "message": STAGES[stage], "at": time.time()}

_segmenter_cache: Segmenter | HeuristicSegmenter | None = None


def get_segmenter() -> Segmenter | HeuristicSegmenter:
    """Load the MONAI bundle once per process; fall back to the pipeline smoke-test model."""
    global _segmenter_cache
    if _segmenter_cache is not None:
        return _segmenter_cache
    bundle_dir = os.environ.get("NEUROSCOPE_BUNDLE_DIR", str(ROOT / "models"))
    try:
        _segmenter_cache = load_segmenter(bundle_dir)
    except FileNotFoundError:
        _segmenter_cache = HeuristicSegmenter()
    return _segmenter_cache


def cleanup() -> None:
    now = time.time()
    for p in JOBS.iterdir():
        if p.is_dir() and now - p.stat().st_mtime > RETENTION_SECONDS:
            shutil.rmtree(p, ignore_errors=True)


@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI):
    cleanup()

    async def sweeper():
        while True:
            await asyncio.sleep(60)
            await run_in_threadpool(cleanup)

    task = asyncio.create_task(sweeper())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="NeuroScope 3D local API", version=__version__, lifespan=lifespan)

# Vite dev server runs on a different origin than the API; loopback-only, no third party.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("NEUROSCOPE_CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_store(request: Request, call_next):
    # Five sequences (four required + optional expert) at up to 1 GB each, plus
    # multipart overhead — reject an oversized request before it is ever streamed.
    length = request.headers.get("content-length")
    if length and int(length) > 5 * MAX_UPLOAD_BYTES + 100_000:
        return HTMLResponse("Upload exceeds the request size limit.", status_code=413)
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/api/health")
def health():
    segmenter = get_segmenter()
    return {
        "status": "ok",
        "model_ready": isinstance(segmenter, Segmenter),
        "model_name": segmenter.info.name,
        "disclaimer": DISCLAIMER,
        "version": __version__,
    }


def _findings(findings) -> list[dict]:
    return [{"code": f.code, "sequence": f.sequence, "message": f.message} for f in findings]


def process(job: str, paths: dict[str, Path], expert_path: Path | None, out: Path) -> dict:
    started = time.perf_counter()
    report_stage(job, "validating")
    validation = validate_study(paths)
    if not validation.ok:
        raise InputRejected(_findings(validation.errors))

    reference = validation.volumes["T1Gd"]
    target_grid = reference.grid

    report_stage(job, "resampling")
    canonical = {n: nio.to_canonical(v.image) for n, v in validation.volumes.items()}
    resampled = {n: nio.resample_to_spacing(img, spacing=1.0, order=1) for n, img in canonical.items()}
    work_image = resampled["T1Gd"]
    try:
        check_voxel_budget(work_image.shape[:3], MAX_INFERENCE_VOXELS, "resampled inference grid")
    except BudgetExceeded as exc:
        raise InputRejected([{"code": "budget_exceeded", "sequence": None, "message": str(exc)}]) from exc
    arrays = {n: np.asanyarray(img.dataobj, dtype=np.float32) for n, img in resampled.items()}

    report_stage(job, "segmenting")
    segmenter = get_segmenter()
    channels = stack_channels(arrays)
    regions_out = segmenter(channels, threshold=0.5)
    label_work = regions_to_label(regions_out["WT"], regions_out["TC"], regions_out["ET"])

    label_image = nib.Nifti1Image(label_work.astype(np.uint8), work_image.affine)
    on_input_grid = nio.resample_onto(label_image, target_grid, order=0)
    label_out = np.asanyarray(on_input_grid.dataobj).astype(np.uint8)

    nio.save_label(label_out, target_grid, out / "prediction.nii.gz", reference=reference.image)

    report_stage(job, "measuring")
    truth = None
    expert_warning = None
    if expert_path is not None:
        lv = validate_label(expert_path, target_grid)
        if lv.ok:
            truth = np.asanyarray(lv.volumes["label"].image.dataobj).astype(np.uint8)
        else:
            expert_warning = "; ".join(f.message for f in lv.errors)

    report_stage(job, "meshing")
    geometry = prepare_viewer(
        images={n: v.image for n, v in validation.volumes.items()},
        label=label_out,
        reference=reference.image,
        out=out,
        expert=truth,
    )

    report_stage(job, "reporting")

    info = segmenter.info
    metadata = {
        **geometry,
        "tool": "NeuroScope 3D",
        "tool_version": __version__,
        "disclaimer": DISCLAIMER,
        "description": "Suspected tumour regions predicted by the model. Estimated volumes.",
        "regions": volumes_all(label_out, reference.spacing),
        "expert": volumes_all(truth, reference.spacing) if truth is not None else None,
        "metrics": {k: m.as_dict() for k, m in score_all(label_out, truth).items()} if truth is not None else None,
        "has_expert": truth is not None,
        "model": {
            "name": info.name, "version": info.version, "licence": info.licence,
            "source": info.source, "deterministic": info.deterministic,
        },
        "warnings": _findings(validation.warnings) + ([{"code": "bad_expert_mask", "message": expert_warning, "sequence": "expert"}] if expert_warning else []),
        "input_sha256": {k: sha256(Path(p)) for k, p in paths.items()},
        "expert_sha256": sha256(expert_path) if (expert_path and truth is not None) else None,
        "code_commit": git_commit(),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "runtime_seconds": time.perf_counter() - started,
        "limitations": [
            "Research and teaching prototype only; not a diagnostic system.",
            "Skull-strip and brain-anatomy sanity checks are heuristics, not a validated classifier.",
            "No voxel-level uncertainty estimate is produced.",
            "2-minute T4 budget not benchmarked on this machine.",
        ],
    }
    (out / "metadata.json").write_text(json.dumps(metadata, indent=2))
    (out / "report.html").write_text(_report_html(metadata), encoding="utf-8")

    for p in paths.values():
        Path(p).unlink(missing_ok=True)
    if expert_path:
        Path(expert_path).unlink(missing_ok=True)
    report_stage(job, "done")
    return metadata


class InputRejected(Exception):
    def __init__(self, errors: list[dict]):
        self.errors = errors
        super().__init__("; ".join(e["message"] for e in errors))


def _valid_job_id(job: str) -> bool:
    return len(job) == 32 and all(c in "0123456789abcdef" for c in job)


@app.post("/api/segment/{job}")
async def segment(
    job: str,
    T1: UploadFile = File(...),
    T1Gd: UploadFile = File(...),
    T2: UploadFile = File(...),
    FLAIR: UploadFile = File(...),
    expert: UploadFile | None = File(None),
):
    # The job id is minted client-side (32 hex chars) so the browser can start
    # polling /status for this id before this request finishes uploading.
    if not _valid_job_id(job):
        raise HTTPException(400, "Invalid job id.")
    uploads = {"T1": T1, "T1Gd": T1Gd, "T2": T2, "FLAIR": FLAIR}
    if not busy.acquire(blocking=False):
        raise HTTPException(409, "One study is already processing. Wait for it to finish.")

    out = JOBS / job
    if out.exists():
        busy.release()
        raise HTTPException(409, "Job id already in use.")
    out.mkdir()
    report_stage(job, "received")
    paths: dict[str, Path] = {}
    expert_path: Path | None = None
    try:
        items = {**uploads, **({"expert": expert} if expert else {})}
        for name, upload in items.items():
            filename = (upload.filename or "").lower()
            suffix = ".nii.gz" if filename.endswith(".nii.gz") else ".nii" if filename.endswith(".nii") else None
            if suffix is None:
                raise InputRejected([{"code": "bad_extension", "sequence": name, "message": f"{name}: expected .nii or .nii.gz."}])
            path = out / (name + suffix)
            total = 0
            with path.open("wb") as fh:
                while chunk := await upload.read(1024 * 1024):
                    total += len(chunk)
                    if total > MAX_UPLOAD_BYTES:
                        raise InputRejected([{"code": "too_large", "sequence": name, "message": f"{name}: exceeds 1 GB."}])
                    fh.write(chunk)
            if name == "expert":
                expert_path = path
            else:
                paths[name] = path

        metadata = await run_in_threadpool(process, job, paths, expert_path, out)
        return {"job_id": job, "status": "completed", "metadata": metadata}
    except InputRejected as exc:
        shutil.rmtree(out, ignore_errors=True)
        with _progress_lock:
            PROGRESS.pop(job, None)
        return JSONResponse({"status": "rejected", "errors": exc.errors}, status_code=422)
    except Exception as exc:  # pragma: no cover - last-resort guard, never return a partial result
        shutil.rmtree(out, ignore_errors=True)
        with _progress_lock:
            PROGRESS.pop(job, None)
        raise HTTPException(500, f"Processing failed; no result is available ({exc.__class__.__name__}).") from exc
    finally:
        busy.release()
        for upload in [*uploads.values(), expert]:
            if upload:
                await upload.close()


@app.get("/api/jobs/{job}/status")
def job_status(job: str):
    with _progress_lock:
        entry = PROGRESS.get(job)
    if entry is None:
        raise HTTPException(404, "Unknown job id.")
    return entry


def _jobdir(job: str) -> Path:
    if len(job) != 32 or any(c not in "0123456789abcdef" for c in job):
        raise HTTPException(404, "Study not found.")
    path = JOBS / job
    if not (path / "metadata.json").exists():
        raise HTTPException(404, "No completed study is available.")
    if time.time() - path.stat().st_mtime > RETENTION_SECONDS:
        raise HTTPException(410, "Study has expired and is being removed.")
    return path


@app.get("/api/jobs/{job}/metadata")
def metadata(job: str):
    return FileResponse(_jobdir(job) / "metadata.json", media_type="application/json")


@app.get("/api/jobs/{job}/volume/{seq}")
def volume(job: str, seq: str):
    if seq not in SEQUENCES:
        raise HTTPException(404, "Sequence not found.")
    return FileResponse(_jobdir(job) / f"{seq}.bin", media_type="application/octet-stream")


@app.get("/api/jobs/{job}/labels")
def labels(job: str):
    return FileResponse(_jobdir(job) / "labels.bin", media_type="application/octet-stream")


@app.get("/api/jobs/{job}/expert-labels")
def expert_labels(job: str):
    p = _jobdir(job) / "expert-labels.bin"
    if not p.exists():
        raise HTTPException(404, "No expert mask was provided.")
    return FileResponse(p, media_type="application/octet-stream")


@app.get("/api/jobs/{job}/prediction")
def prediction(job: str):
    return FileResponse(_jobdir(job) / "prediction.nii.gz", filename="prediction.nii.gz", media_type="application/gzip")


@app.get("/api/jobs/{job}/report")
def report(job: str):
    return FileResponse(_jobdir(job) / "report.html", media_type="text/html")


def _report_html(m: dict) -> str:
    rows = "".join(
        f"<tr><td>{k}</td><td>{v['voxels']:,}</td><td>{v['volume_ml']:.3f}</td><td>{v['formula']}</td></tr>"
        for k, v in m["regions"].items()
    )
    metrics_block = (
        json.dumps({"expert_volumes": m["expert"], "metrics": m["metrics"]}, indent=2)
        if m["has_expert"] else "No expert mask was provided for this study."
    )
    return (
        '<!doctype html><html><head><meta charset="utf-8"><title>NeuroScope 3D report</title>'
        "<style>body{font:14px system-ui;max-width:880px;margin:40px auto;padding:20px;color:#182a42}"
        "p{line-height:1.7}table{width:100%;border-collapse:collapse}td,th{padding:10px;text-align:left;"
        "border-bottom:1px solid #ccc}pre{white-space:pre-wrap;font-size:11px;background:#f0f4f8;padding:18px;"
        "overflow-wrap:anywhere}.note{background:#edf2f7;padding:16px}@media print{button{display:none}}</style>"
        "</head><body><h1>NeuroScope 3D report</h1>"
        f'<p class="note"><b>{html.escape(m["disclaimer"])}</b></p>'
        "<p>Suspected tumour regions predicted by the model. Estimated volumes below do not establish a diagnosis.</p>"
        "<h2>Estimated volumes</h2><table><tr><th>Region</th><th>Voxels</th><th>mL</th><th>Formula</th></tr>"
        f"{rows}</table><h2>Expert comparison</h2><pre>{html.escape(metrics_block)}</pre>"
        f"<h2>Provenance, warnings and limitations</h2><pre>{html.escape(json.dumps(m, indent=2))}</pre>"
        '<button onclick="print()">Print / Save as PDF</button></body></html>'
    )
