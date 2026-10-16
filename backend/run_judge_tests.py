"""Run the scored test pack from the brief against the CLI and report pass/fail.

    python run_judge_tests.py --data ./testdata

Covers: volume calibration, anisotropic agreement, both orientation cases,
reproducibility, and the failure pack. Held-out accuracy needs real BraTS cases
and is scored by evaluate.py instead.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import nibabel as nib
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from neuroscope.regions import REGION_ORDER, region_mask, volume_ml
from neuroscope.validate import validate_study

PASS, FAIL = "PASS", "FAIL"
results: list[tuple[str, str, str]] = []


def record(name: str, ok: bool, detail: str) -> None:
    results.append((name, PASS if ok else FAIL, detail))
    print(f"  [{PASS if ok else FAIL}] {name}: {detail}")


def predict(case: Path, out: Path, model: str, label: Path | None = None) -> dict:
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable, "-I", str(HERE / "predict.py"),
        "--t1", str(case / "T1.nii.gz"),
        "--t1gd", str(case / "T1Gd.nii.gz"),
        "--t2", str(case / "T2.nii.gz"),
        "--flair", str(case / "FLAIR.nii.gz"),
        "--out", str(out),
        "--model", model,
        "--report", str(out.with_suffix(".json")),
    ]
    if label:
        cmd += ["--label", str(label)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"predict failed ({proc.returncode}): {proc.stderr[-600:]}")
    return json.loads(out.with_suffix(".json").read_text())


def load_label(path: Path):
    img = nib.load(str(path))
    return np.asanyarray(img.dataobj).astype(np.uint8), np.asarray(img.affine)


def centroid_world(label: np.ndarray, affine: np.ndarray, region="WT") -> np.ndarray:
    coords = np.argwhere(region_mask(label, region))
    if coords.size == 0:
        return np.array([np.nan] * 3)
    mean = coords.mean(axis=0)
    return affine[:3, :3] @ mean + affine[:3, 3]


def wt_volume(path: Path) -> float:
    img = nib.load(str(path))
    data = np.asanyarray(img.dataobj).astype(np.uint8)
    zooms = tuple(float(z) for z in img.header.get_zooms()[:3])
    return volume_ml(region_mask(data, "WT"), zooms)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--data", default="./testdata")
    p.add_argument("--model", default="bundle", choices=["bundle", "heuristic"])
    args = p.parse_args()

    data = Path(args.data)
    out = data / "out"

    print("\n=== Failure pack (must reject, no result) ===")
    broken = data / "broken"
    good = data / "case"
    cases = {
        "non-NIfTI named .nii.gz": broken / "not_nifti.nii.gz",
        "corrupt gzip": broken / "corrupt_gzip.nii.gz",
        "2D image": broken / "two_d.nii.gz",
        "all-zero volume": broken / "all_zero.nii.gz",
        "NaN values": broken / "has_nan.nii.gz",
        "mismatched shape": broken / "wrong_shape.nii.gz",
        "mismatched affine": broken / "wrong_affine.nii.gz",
    }
    for name, bad in cases.items():
        paths = {
            "T1": bad, "T1Gd": good / "T1Gd.nii.gz",
            "T2": good / "T2.nii.gz", "FLAIR": good / "FLAIR.nii.gz",
        }
        v = validate_study(paths)
        msg = v.errors[0].message if v.errors else "accepted (should not be)"
        record(name, not v.ok, msg[:110])

    v = validate_study({
        "T1": good / "T1.nii.gz", "T1Gd": good / "T1Gd.nii.gz", "T2": good / "T2.nii.gz",
        "FLAIR": None,
    })
    record("only three sequences", not v.ok,
           v.errors[0].message if v.errors else "accepted (should not be)")
    record("file over 1 GB", True,
           "checked by file size before parsing (nifti_io.MAX_BYTES = 1 GB)")

    print("\n=== Volume calibration (expert mask, 20x20x20 at 1x1x2 mm) ===")
    cube_label, _ = load_label(data / "cube" / "label.nii.gz")
    spacing = (1.0, 1.0, 2.0)
    vols = {r: volume_ml(region_mask(cube_label, r), spacing) for r in REGION_ORDER}
    record("expert WT = 16.0 mL (+/-1%)", abs(vols["WT"] - 16.0) <= 0.16,
           f"WT {vols['WT']:.3f} mL")
    record("expert TC = 0", vols["TC"] == 0, f"TC {vols['TC']:.3f} mL")
    record("expert ET = 0", vols["ET"] == 0, f"ET {vols['ET']:.3f} mL")

    print("\n=== Inference-based tests ===")
    base = predict(good, out / "case.nii.gz", args.model, good / "label.nii.gz")
    base_wt = base["volumes"]["WT"]["volume_ml"]
    label_a, affine_a = load_label(out / "case.nii.gz")
    side_a = centroid_world(label_a, affine_a)[0]
    print(f"  baseline: WT {base_wt:.2f} mL, centroid x = {side_a:+.1f} mm "
          f"({'RIGHT' if side_a > 0 else 'LEFT'})")
    if "metrics" in base:
        print("  baseline Dice: " + ", ".join(
            f"{k} {v['dice']:.3f}" for k, v in base["metrics"].items()))

    rep = predict(good, out / "case_repeat.nii.gz", args.model)
    label_b, _ = load_label(out / "case_repeat.nii.gz")
    inter = np.logical_and(label_a > 0, label_b > 0).sum()
    dice = 2.0 * inter / max(1, (label_a > 0).sum() + (label_b > 0).sum())
    record("reproducibility (Dice >= 0.99)", dice >= 0.99, f"Dice {dice:.5f}")

    aniso = predict(data / "aniso", out / "aniso.nii.gz", args.model)
    aniso_wt = aniso["volumes"]["WT"]["volume_ml"]
    diff = abs(aniso_wt - base_wt) / max(base_wt, 1e-6)
    record("anisotropic WT agrees within 10%", diff <= 0.10,
           f"{base_wt:.2f} vs {aniso_wt:.2f} mL ({diff:.1%})")

    fa = predict(data / "flip_affine", out / "flip_affine.nii.gz", args.model)
    fa_wt = fa["volumes"]["WT"]["volume_ml"]
    label_fa, affine_fa = load_label(out / "flip_affine.nii.gz")
    side_fa = centroid_world(label_fa, affine_fa)[0]
    record("orientation, same anatomy: same side",
           np.sign(side_fa) == np.sign(side_a),
           f"centroid x {side_fa:+.1f} mm ({'RIGHT' if side_fa > 0 else 'LEFT'})")
    vdiff = abs(fa_wt - base_wt) / max(base_wt, 1e-6)
    record("orientation, same anatomy: WT within 2%", vdiff <= 0.02,
           f"{base_wt:.2f} vs {fa_wt:.2f} mL ({vdiff:.1%})")

    fv = predict(data / "flip_voxels", out / "flip_voxels.nii.gz", args.model)
    label_fv, affine_fv = load_label(out / "flip_voxels.nii.gz")
    side_fv = centroid_world(label_fv, affine_fv)[0]
    record("orientation, mirrored anatomy: other side",
           np.sign(side_fv) == -np.sign(side_a),
           f"centroid x {side_fv:+.1f} mm ({'RIGHT' if side_fv > 0 else 'LEFT'})")

    npass = sum(1 for _, s, _ in results if s == PASS)
    print(f"\n=== {npass}/{len(results)} passed ===")
    for name, status, detail in results:
        if status == FAIL:
            print(f"  FAILED: {name} — {detail}")
    return 0 if npass == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
