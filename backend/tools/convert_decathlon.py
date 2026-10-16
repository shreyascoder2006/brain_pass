"""Convert Medical Segmentation Decathlon Task01_BrainTumour into this
pipeline's expected layout: four separate per-modality NIfTI files per case
(not Decathlon's stacked 4D volume) and BraTS label codes 1/2/4 (not
Decathlon's own 0/1/2/3 scheme) — plus a patient-level held-out split and a
self-hashing manifest, so every later Dice/HD95 number can cite exactly
which data, and which split, produced it.

This closes `docs/IMPLEMENTATION_PLAN.md` Phase 1a — the one step in that
plan unblocked today: no registration gate (CC-BY-SA 4.0), no GPU required,
just a download and a deterministic reshuffle.

Decathlon's own `dataset.json` is the authority on channel/label order, not
assumption — this script reads it from the downloaded copy and refuses to
proceed if it doesn't match what every reference for this dataset reports
(modalities 0:FLAIR 1:T1w 2:t1gd 3:T2w; labels 0:background 1:edema
2:non-enhancing-tumor 3:enhancing-tumour), since silently trusting a mapping
that turned out wrong would poison every downstream number.

    # Fresh run: download, extract, convert, split, manifest
    python backend/tools/convert_decathlon.py --out backend/data

    # Already have Task01_BrainTumour extracted somewhere
    python backend/tools/convert_decathlon.py --out backend/data --root /path/to/Task01_BrainTumour

    # Quick smoke run on a handful of cases, no download
    python backend/tools/convert_decathlon.py --out backend/data --root /path/to/Task01_BrainTumour --limit 6
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import nibabel as nib
import numpy as np

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from neuroscope.provenance import git_commit, sha256  # noqa: E402
from neuroscope.regions import ED, ET, NCR  # noqa: E402

DATASET_NAME = "Medical Segmentation Decathlon — Task01_BrainTumour"
LICENCE = "CC-BY-SA 4.0"
CITATION = "Antonelli et al., 'The Medical Segmentation Decathlon', Nature Communications 2022 — http://medicaldecathlon.com/"
SOURCE_URL = "https://msd-for-monai.s3-us-west-2.amazonaws.com/Task01_BrainTumour.tar"
SOURCE_MD5 = "240a19d752f0d9e9101544901065d872"

# What every published copy of this dataset's dataset.json reports. Checked
# against the actual downloaded file at conversion time (see `_check_dataset_json`)
# rather than assumed — this exact mismatch is the "known gotcha" the dataset's
# own authors flag, and getting it wrong silently mislabels every case.
EXPECTED_MODALITIES = {"0": "FLAIR", "1": "T1w", "2": "t1gd", "3": "T2w"}
EXPECTED_LABELS = {
    "0": "background",
    "1": "edema",
    "2": "non-enhancing tumor",
    "3": "enhancing tumour",
}

# Our pipeline's channel names, keyed by the modality name Decathlon uses.
MODALITY_TO_CHANNEL = {"FLAIR": "FLAIR", "T1w": "T1", "t1gd": "T1Gd", "T2w": "T2"}

# File-name suffix for each channel, matching backend/evaluate.py's own PATTERNS
# so converted cases are directly scorable with the existing evaluation script.
CHANNEL_SUFFIX = {"T1": "t1", "T1Gd": "t1ce", "T2": "t2", "FLAIR": "flair"}

# Decathlon code -> BraTS code. Decathlon's "non-enhancing tumor" is BraTS's
# necrotic core (NCR); the two datasets use different words for the same
# region. Verify against docs/IMPLEMENTATION_PLAN.md section 1a before trusting
# this blindly on a dataset revision this script hasn't been checked against.
LABEL_REMAP = {0: 0, 1: ED, 2: NCR, 3: ET}


class ConversionError(RuntimeError):
    """Raised with a message meant to be read directly, not re-wrapped."""


@dataclass
class CaseResult:
    case_id: str
    channel_files: dict[str, str]
    label_file: str
    source_image_sha256: str
    source_label_sha256: str


def _download(dest_dir: Path) -> Path:
    try:
        from monai.apps.utils import download_and_extract
    except ImportError as exc:
        raise ConversionError(
            "monai is required to download the dataset automatically. "
            "Install it (`pip install -r backend/requirements.txt`), or pass "
            "--root pointing at an already-extracted Task01_BrainTumour folder."
        ) from exc

    dest_dir.mkdir(parents=True, exist_ok=True)
    tar_path = dest_dir / "Task01_BrainTumour.tar"
    print(f"Downloading {SOURCE_URL} ...")
    download_and_extract(
        url=SOURCE_URL,
        filepath=str(tar_path),
        output_dir=str(dest_dir),
        hash_val=SOURCE_MD5,
        hash_type="md5",
    )
    root = dest_dir / "Task01_BrainTumour"
    if not root.exists():
        raise ConversionError(
            f"Download and extraction finished but {root} was not created — "
            "the archive layout may have changed upstream."
        )
    return root


def _check_dataset_json(root: Path) -> dict:
    meta_path = root / "dataset.json"
    if not meta_path.exists():
        raise ConversionError(f"{meta_path} not found — is {root} a real Task01_BrainTumour extract?")
    meta = json.loads(meta_path.read_text())

    modalities = {str(k): v for k, v in meta.get("modality", {}).items()}
    labels = {str(k): v for k, v in meta.get("labels", {}).items()}

    def _norm(d: dict) -> dict:
        return {k: str(v).strip().lower() for k, v in d.items()}

    if _norm(modalities) != _norm(EXPECTED_MODALITIES):
        raise ConversionError(
            "dataset.json's modality order does not match what this script assumes "
            f"(expected {EXPECTED_MODALITIES}, found {modalities}). Refusing to guess — "
            "update MODALITY_TO_CHANNEL in this script only after confirming the real order."
        )
    if _norm(labels) != _norm(EXPECTED_LABELS):
        raise ConversionError(
            "dataset.json's label scheme does not match what this script assumes "
            f"(expected {EXPECTED_LABELS}, found {labels}). Refusing to guess — "
            "update LABEL_REMAP in this script only after confirming the real codes."
        )
    return meta


def _find_cases(root: Path) -> list[tuple[str, Path, Path]]:
    images_dir = root / "imagesTr"
    labels_dir = root / "labelsTr"
    if not images_dir.exists() or not labels_dir.exists():
        raise ConversionError(f"Expected imagesTr/ and labelsTr/ under {root}, found neither or one missing.")

    cases = []
    for image_path in sorted(images_dir.glob("*.nii.gz")):
        if image_path.name.startswith("._"):
            continue  # macOS resource-fork artefacts, shipped in some mirrors
        case_id = image_path.name.removesuffix(".nii.gz")
        label_path = labels_dir / image_path.name
        if not label_path.exists():
            continue  # imagesTr case with no matching label — skip, don't guess
        cases.append((case_id, image_path, label_path))
    return cases


def _convert_case(case_id: str, image_path: Path, label_path: Path, out_dir: Path) -> CaseResult:
    image = nib.load(str(image_path))
    data = np.asanyarray(image.dataobj)
    if data.ndim != 4 or data.shape[-1] != 4:
        raise ConversionError(f"{case_id}: expected a 4D volume with 4 channels, got shape {data.shape}.")

    case_dir = out_dir / case_id
    case_dir.mkdir(parents=True, exist_ok=True)

    channel_files: dict[str, str] = {}
    for index, modality_name in EXPECTED_MODALITIES.items():
        channel = MODALITY_TO_CHANNEL[modality_name]
        suffix = CHANNEL_SUFFIX[channel]
        out_path = case_dir / f"{case_id}_{suffix}.nii.gz"
        channel_image = nib.Nifti1Image(
            np.asarray(data[..., int(index)], dtype=np.float32), image.affine, image.header
        )
        channel_image.header.set_data_dtype(np.float32)
        nib.save(channel_image, str(out_path))
        channel_files[channel] = out_path.name

    label_image = nib.load(str(label_path))
    label_data = np.asanyarray(label_image.dataobj).astype(np.int16)
    remapped = np.zeros_like(label_data, dtype=np.uint8)
    for src, dst in LABEL_REMAP.items():
        remapped[label_data == src] = dst

    unmapped = ~np.isin(label_data, list(LABEL_REMAP.keys()))
    if unmapped.any():
        raise ConversionError(
            f"{case_id}: label volume contains codes outside {sorted(LABEL_REMAP)} "
            f"({sorted(set(label_data[unmapped].tolist()))}) — refusing to silently zero them out."
        )

    label_out = case_dir / f"{case_id}_seg.nii.gz"
    label_out_image = nib.Nifti1Image(remapped, label_image.affine, label_image.header)
    label_out_image.header.set_data_dtype(np.uint8)
    nib.save(label_out_image, str(label_out))

    return CaseResult(
        case_id=case_id,
        channel_files=channel_files,
        label_file=label_out.name,
        source_image_sha256=sha256(image_path),
        source_label_sha256=sha256(label_path),
    )


def _split(case_ids: list[str], train_fraction: float, seed: int) -> tuple[list[str], list[str]]:
    ordered = sorted(case_ids)  # deterministic input order before shuffling
    rng = random.Random(seed)
    shuffled = ordered[:]
    rng.shuffle(shuffled)
    cut = round(len(shuffled) * train_fraction)
    train, held_out = sorted(shuffled[:cut]), sorted(shuffled[cut:])
    return train, held_out


def _write_manifest(path: Path, payload: dict) -> str:
    """Write `payload`, then append a sha256 of that exact content as
    `manifest_sha256` and rewrite — so the hash is always self-consistent
    with what's on disk, and downstream scripts can verify it."""
    body = json.dumps(payload, indent=2, sort_keys=True)
    digest = __import__("hashlib").sha256(body.encode("utf-8")).hexdigest()
    payload = {**payload, "manifest_sha256": digest}
    path.write_text(json.dumps(payload, indent=2, sort_keys=True))
    return digest


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", default=str(BACKEND_ROOT / "data"), help="Output root (converted cases + manifest).")
    p.add_argument("--root", default=None, help="Already-extracted Task01_BrainTumour folder; skips download.")
    p.add_argument("--download-dir", default=None, help="Where to download/extract if --root is not given.")
    p.add_argument("--limit", type=int, default=None, help="Convert only the first N cases (smoke-testing).")
    p.add_argument("--train-fraction", type=float, default=0.8)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--force", action="store_true", help="Re-convert even if a case's output folder already exists.")
    args = p.parse_args()

    out_dir = Path(args.out)
    cases_dir = out_dir / "decathlon"
    out_dir.mkdir(parents=True, exist_ok=True)

    root = Path(args.root) if args.root else _download(Path(args.download_dir or (out_dir / "raw")))
    meta = _check_dataset_json(root)

    cases = _find_cases(root)
    if not cases:
        print(f"No labelled cases found under {root}/imagesTr + labelsTr.", file=sys.stderr)
        return 1
    if args.limit:
        cases = cases[: args.limit]

    results: list[CaseResult] = []
    skipped: list[dict] = []
    for i, (case_id, image_path, label_path) in enumerate(cases, start=1):
        case_dir = cases_dir / case_id
        if case_dir.exists() and not args.force:
            print(f"[{i}/{len(cases)}] {case_id}: already converted, skipping (--force to redo)")
            # still need it in the manifest/split, so re-derive the lightweight parts
            channel_files = {ch: f"{case_id}_{CHANNEL_SUFFIX[ch]}.nii.gz" for ch in CHANNEL_SUFFIX}
            results.append(CaseResult(
                case_id=case_id,
                channel_files=channel_files,
                label_file=f"{case_id}_seg.nii.gz",
                source_image_sha256=sha256(image_path),
                source_label_sha256=sha256(label_path),
            ))
            continue
        try:
            result = _convert_case(case_id, image_path, label_path, cases_dir)
            results.append(result)
            print(f"[{i}/{len(cases)}] {case_id}: converted")
        except ConversionError as exc:
            skipped.append({"case": case_id, "reason": str(exc)})
            print(f"[{i}/{len(cases)}] {case_id}: SKIPPED — {exc}", file=sys.stderr)

    if not results:
        print("No cases converted successfully.", file=sys.stderr)
        return 1

    case_ids = [r.case_id for r in results]
    train_ids, held_out_ids = _split(case_ids, args.train_fraction, args.seed)

    split_payload = {
        "seed": args.seed,
        "train_fraction": args.train_fraction,
        "train": train_ids,
        "held_out": held_out_ids,
        "note": "Patient-level split over Decathlon Task01_BrainTumour case IDs. "
                "Read from this file, never re-derived informally — see "
                "docs/IMPLEMENTATION_PLAN.md Phase 1a.",
    }
    split_path = out_dir / "decathlon_split.json"
    split_path.write_text(json.dumps(split_payload, indent=2, sort_keys=True))

    manifest_payload = {
        "dataset": DATASET_NAME,
        "licence": LICENCE,
        "citation": CITATION,
        "source_url": SOURCE_URL,
        "source_md5": SOURCE_MD5,
        "dataset_json_tensor_image_size": meta.get("tensorImageSize"),
        "label_remap": {
            "decathlon_code_to_brats_code": {str(k): int(v) for k, v in LABEL_REMAP.items()},
            "decathlon_meaning": EXPECTED_LABELS,
            "brats_meaning": {"0": "background", "1": "NCR", "2": "ED", "4": "ET"},
        },
        "modality_order": EXPECTED_MODALITIES,
        "output_root": str(cases_dir),
        "case_count": len(results),
        "train_count": len(train_ids),
        "held_out_count": len(held_out_ids),
        "split_file": split_path.name,
        "skipped": skipped,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "code_commit": git_commit(),
        "pretraining_overlap": (
            "Not independently verifiable from this checkpoint's public release — "
            "the MONAI brats_mri_segmentation bundle was trained on BraTS 2018, and "
            "whether specific Decathlon case IDs overlap that training set cannot be "
            "confirmed from the information published with the checkpoint. State this "
            "limitation; do not claim a clean split that can't be proven."
        ),
        "note": "A conversion + split manifest, not an accuracy claim. Run "
                "backend/evaluate.py against this split's held-out cases to produce one.",
    }
    manifest_path = out_dir / "manifest.json"
    digest = _write_manifest(manifest_path, manifest_payload)

    print(f"\n{len(results)} cases converted/known ({len(skipped)} skipped)")
    print(f"Train: {len(train_ids)}  Held-out: {len(held_out_ids)}")
    print(f"Wrote {split_path}")
    print(f"Wrote {manifest_path} (sha256 {digest})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
