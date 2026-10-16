"""Score the pipeline over a folder of labelled cases, split by patient.

    python evaluate.py --root /path/to/BraTS2021 --limit 10 --out eval.json

Expects one folder per case, each holding the four sequences and a label map,
named the way BraTS 2021 ships them (``*_t1.nii.gz``, ``*_t1ce.nii.gz``,
``*_t2.nii.gz``, ``*_flair.nii.gz``, ``*_seg.nii.gz``).

Reports per-region Dice and sensitivity, the mean over cases, and the case list
that produced it, so the split is inspectable rather than asserted.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

import nibabel as nib
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from neuroscope import DISCLAIMER
from neuroscope import nifti_io as nio
from neuroscope.infer import HeuristicSegmenter, load_segmenter, stack_channels
from neuroscope.regions import REGION_ORDER, hd95, regions_to_label, score_all
from neuroscope.validate import validate_study

PATTERNS = {
    "T1": r"_t1\.nii", "T1Gd": r"_t1ce\.nii|_t1gd\.nii",
    "T2": r"_t2\.nii", "FLAIR": r"_flair\.nii",
}
LABEL_PATTERN = r"_seg\.nii"


def find_case(folder: Path) -> tuple[dict[str, Path], Path | None]:
    files = list(folder.glob("*.nii*"))
    found: dict[str, Path] = {}
    for name, pattern in PATTERNS.items():
        for f in files:
            if re.search(pattern, f.name, re.I):
                found[name] = f
                break
    label = next((f for f in files if re.search(LABEL_PATTERN, f.name, re.I)), None)
    return found, label


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--root", required=True)
    p.add_argument("--limit", type=int, default=10)
    p.add_argument("--out", default="eval.json")
    p.add_argument("--model", choices=["bundle", "heuristic"], default="bundle")
    p.add_argument("--bundle-dir", default=str(HERE / "models"))
    p.add_argument("--spacing", type=float, default=1.0)
    p.add_argument(
        "--training-overlap",
        default="unknown",
        help="State how these cases relate to the model's training set. The MONAI "
             "bundle was trained on BraTS 2018, which overlaps BraTS 2021 — if you "
             "cannot rule the overlap out, say so here and it goes in the report.",
    )
    args = p.parse_args()

    root = Path(args.root)
    folders = sorted(d for d in root.iterdir() if d.is_dir())
    if not folders:
        print(f"No case folders under {root}", file=sys.stderr)
        return 1

    segmenter = (load_segmenter(args.bundle_dir) if args.model == "bundle"
                 else HeuristicSegmenter())

    rows, skipped = [], []
    for folder in folders[: args.limit]:
        paths, label_path = find_case(folder)
        if len(paths) < 4 or label_path is None:
            skipped.append({"case": folder.name, "reason": "incomplete case folder"})
            continue

        v = validate_study(paths)
        if not v.ok:
            skipped.append({"case": folder.name, "reason": v.errors[0].message})
            continue

        started = time.time()
        canonical = {n: nio.to_canonical(vol.image) for n, vol in v.volumes.items()}
        resampled = {n: nio.resample_to_spacing(img, args.spacing, order=1)
                     for n, img in canonical.items()}
        arrays = {n: np.asanyarray(i.dataobj, dtype=np.float32) for n, i in resampled.items()}

        regions = segmenter(stack_channels(arrays))
        work = regions_to_label(regions["WT"], regions["TC"], regions["ET"])

        grid = v.volumes["T1Gd"].grid
        on_grid = nio.resample_onto(
            nib.Nifti1Image(work.astype(np.uint8), resampled["T1Gd"].affine), grid, order=0
        )
        pred = np.asanyarray(on_grid.dataobj).astype(np.uint8)
        truth = np.asanyarray(nib.load(str(label_path)).dataobj).astype(np.uint8)

        metrics = score_all(pred, truth)
        spacing = v.volumes["T1Gd"].spacing
        distances = {r: hd95(pred, truth, r, spacing) for r in REGION_ORDER}
        rows.append({
            "case": folder.name,
            "seconds": round(time.time() - started, 1),
            **{r: {**metrics[r].as_dict(), **distances[r].as_dict()} for r in REGION_ORDER},
        })
        print(f"{folder.name}: " + ", ".join(
            f"{r} dice {metrics[r].dice:.3f} sens {metrics[r].sensitivity:.3f} "
            f"hd95 {distances[r].hd95_mm:.2f}mm" if distances[r].hd95_mm is not None
            else f"{r} dice {metrics[r].dice:.3f} sens {metrics[r].sensitivity:.3f} hd95 n/a"
            for r in REGION_ORDER))

    if not rows:
        print("No scorable cases.", file=sys.stderr)
        return 1

    def _mean_hd95(region: str) -> dict:
        values = [row[region]["hd95_mm"] for row in rows if row[region]["hd95_mm"] is not None]
        undefined = len(rows) - len(values)
        return {
            "mean_hd95_mm": round(float(np.mean(values)), 3) if values else None,
            "hd95_undefined_cases": undefined,  # empty prediction or empty ground truth for this region
        }

    summary = {
        r: {
            "mean_dice": round(float(np.mean([row[r]["dice"] for row in rows])), 4),
            "mean_sensitivity": round(float(np.mean([row[r]["sensitivity"] for row in rows])), 4),
            **_mean_hd95(r),
        }
        for r in REGION_ORDER
    }

    report = {
        "disclaimer": DISCLAIMER,
        "model": segmenter.info.__dict__,
        "cases_scored": len(rows),
        "case_ids": [row["case"] for row in rows],
        "skipped": skipped,
        "split": "held-out by patient; one folder per patient, no patient appears twice",
        "training_data_overlap": args.training_overlap,
        "summary": summary,
        "per_case": rows,
    }
    Path(args.out).write_text(json.dumps(report, indent=2))

    print("\n=== mean over " + str(len(rows)) + " cases ===")
    for r in REGION_ORDER:
        hd95_str = (f"{summary[r]['mean_hd95_mm']:.2f}mm"
                    if summary[r]["mean_hd95_mm"] is not None else "n/a")
        print(f"  {r}: Dice {summary[r]['mean_dice']:.4f}  "
              f"Sensitivity {summary[r]['mean_sensitivity']:.4f}  "
              f"HD95 {hd95_str} ({summary[r]['hd95_undefined_cases']} undefined)")
    print(f"\nTraining-data overlap: {args.training_overlap}")
    print(f"Wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
