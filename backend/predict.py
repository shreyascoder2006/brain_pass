"""NeuroScope 3D — segmentation CLI.

Takes four co-registered NIfTI sequences and writes a BraTS 2021 coded label map
(1 NCR, 2 ED, 4 ET) on the *input* grid and affine.

    python predict.py --t1 T1.nii.gz --t1gd T1Gd.nii.gz --t2 T2.nii.gz \
                      --flair FLAIR.nii.gz --out seg.nii.gz

Research and teaching prototype only. Never use model output as a diagnosis.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

import nibabel as nib
import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from neuroscope import DISCLAIMER, __version__
from neuroscope import nifti_io as nio
from neuroscope.infer import HeuristicSegmenter, load_segmenter, stack_channels
from neuroscope.regions import regions_to_label, volumes_all, score_all
from neuroscope.validate import SEQUENCES, validate_study


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def git_commit() -> str:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=Path(__file__).resolve().parent,
            capture_output=True, text=True, timeout=5,
        )
        return out.stdout.strip() or "not a git repository"
    except Exception:
        return "unavailable"


def make_deterministic(seed: int = 0) -> None:
    torch.manual_seed(seed)
    np.random.seed(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)
    torch.backends.cudnn.benchmark = False


def run(args) -> int:
    started = time.time()
    make_deterministic(args.seed)

    paths = {
        "T1": args.t1, "T1Gd": args.t1gd, "T2": args.t2, "FLAIR": args.flair,
    }

    report = {
        "tool": "NeuroScope 3D",
        "tool_version": __version__,
        "disclaimer": DISCLAIMER,
        "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "code_commit": git_commit(),
    }

    validation = validate_study(paths)
    report["validation"] = {
        "ok": validation.ok,
        "errors": [{"code": f.code, "sequence": f.sequence, "message": f.message} for f in validation.errors],
        "warnings": [{"code": f.code, "sequence": f.sequence, "message": f.message} for f in validation.warnings],
    }

    if not validation.ok:
        print("INPUT REJECTED — no result produced.\n", file=sys.stderr)
        for f in validation.errors:
            print(f"  [{f.code}] {f.message}", file=sys.stderr)
        if args.report:
            Path(args.report).write_text(json.dumps(report, indent=2))
        return 2

    for f in validation.warnings:
        print(f"WARNING [{f.code}] {f.message}", file=sys.stderr)

    # The grid every result must land back on.
    reference = validation.volumes["T1Gd"]
    target_grid = reference.grid
    report["input"] = {
        "shape": list(target_grid.shape),
        "spacing_mm": [round(z, 6) for z in reference.spacing],
        "affine": np.asarray(target_grid.affine).round(6).tolist(),
        "sha256": {name: sha256(Path(paths[name])) for name in SEQUENCES},
    }

    # Canonical RAS, then an isotropic 1 mm grid, which is what the model saw in training.
    canonical = {n: nio.to_canonical(v.image) for n, v in validation.volumes.items()}
    resampled = {
        n: nio.resample_to_spacing(img, spacing=args.spacing, order=1)
        for n, img in canonical.items()
    }
    work_image = resampled["T1Gd"]
    arrays = {n: np.asanyarray(img.dataobj, dtype=np.float32) for n, img in resampled.items()}

    report["preprocessing"] = {
        "reorient": "closest canonical (RAS+)",
        "resample_mm": args.spacing,
        "interpolation": "trilinear for intensities, nearest for labels",
        "intensity": "per-channel z-score over non-zero voxels",
        "channel_order": "T1Gd, T1, T2, FLAIR",
    }

    if args.model == "bundle":
        segmenter = load_segmenter(args.bundle_dir)
    else:
        segmenter = HeuristicSegmenter()
        print(
            "WARNING: running the intensity baseline, which is NOT a trained "
            "segmentation model. Output is for pipeline testing only.",
            file=sys.stderr,
        )

    info = segmenter.info
    report["model"] = {
        "name": info.name, "version": info.version, "licence": info.licence,
        "source": info.source, "deterministic": info.deterministic,
        "threshold": args.threshold, "seed": args.seed,
    }

    channels = stack_channels(arrays)
    regions = segmenter(channels, threshold=args.threshold)
    label_work = regions_to_label(regions["WT"], regions["TC"], regions["ET"])

    # Back onto the caller's grid, nearest-neighbour so codes stay 0/1/2/4.
    label_image = nib.Nifti1Image(label_work.astype(np.uint8), work_image.affine)
    on_input_grid = nio.resample_onto(label_image, target_grid, order=0)
    label_out = np.asanyarray(on_input_grid.dataobj).astype(np.uint8)

    out_path = nio.save_label(label_out, target_grid, args.out, reference=reference.image)

    report["volumes"] = volumes_all(label_out, reference.spacing)
    report["output"] = {"path": str(out_path), "codes": "1 NCR, 2 ED, 4 ET"}

    if args.label:
        from neuroscope.validate import validate_label

        lv = validate_label(args.label, target_grid)
        if lv.ok:
            truth = np.asanyarray(lv.volumes["label"].image.dataobj).astype(np.uint8)
            report["metrics"] = {k: m.as_dict() for k, m in score_all(label_out, truth).items()}
            report["expert_volumes"] = volumes_all(truth, reference.spacing)
        else:
            report["metrics"] = {"error": [f.message for f in lv.errors]}

    report["runtime_seconds"] = round(time.time() - started, 2)

    if args.report:
        Path(args.report).write_text(json.dumps(report, indent=2))

    print(json.dumps({
        "output": str(out_path),
        "volumes_ml": {k: v["volume_ml"] for k, v in report["volumes"].items()},
        **({"dice": {k: v["dice"] for k, v in report["metrics"].items()}}
           if args.label and "error" not in report.get("metrics", {}) else {}),
        "runtime_seconds": report["runtime_seconds"],
    }, indent=2))
    return 0


def main() -> int:
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    p.add_argument("--t1", required=True)
    p.add_argument("--t1gd", required=True)
    p.add_argument("--t2", required=True)
    p.add_argument("--flair", required=True)
    p.add_argument("--out", required=True, help="output label map (.nii.gz)")
    p.add_argument("--label", help="optional expert mask, for scoring")
    p.add_argument("--report", help="write a JSON provenance report here")
    p.add_argument("--bundle-dir", default=str(Path(__file__).parent / "models"))
    p.add_argument("--model", choices=["bundle", "heuristic"], default="bundle")
    p.add_argument("--spacing", type=float, default=1.0)
    p.add_argument("--threshold", type=float, default=0.5)
    p.add_argument("--seed", type=int, default=0)
    args = p.parse_args()

    try:
        return run(args)
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
