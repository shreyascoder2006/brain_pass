"""Generate a small gallery of synthetic demo cases with genuinely different
tumour geometry — not the judges' calibration pack (which deliberately keeps
geometry identical across variants to isolate one thing at a time), but a
set meant to be clicked through live in the UI's "Datasets" panel so a
single-case demo doesn't have to carry the whole pitch.

Each case runs through the real pipeline exactly like an uploaded study —
same validation, same model, same uncertainty, same connectivity analysis —
so what's "different" between them is the geometry, not the code path. This
stays on the right side of the project's own honesty rule: these are
synthetic phantoms, exercising the pipeline and visibly varying the trust
layer (a multifocal case shows "2 disconnected regions"; a large diffuse
case shows a bigger WT:TC ratio and a different uncertainty footprint), not
a claim about real tumour accuracy — that claim only ever comes from real
data (see docs/IMPLEMENTATION_PLAN.md Phase 1 and the Decathlon samples
fetched by fetch_decathlon_sample.py).

    python backend/tools/make_demo_gallery.py --out backend/samples
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import nibabel as nib
import numpy as np

HERE = Path(__file__).resolve().parent
BACKEND_ROOT = HERE.parent
sys.path.insert(0, str(BACKEND_ROOT))

from make_testcase import LUT, SEQUENCES, ras_affine, write_study  # noqa: E402


def build_brain(shape, spacing, seed):
    rng = np.random.default_rng(seed)
    affine = ras_affine(spacing, shape)

    i, j, k = np.meshgrid(*[np.arange(n) for n in shape], indexing="ij")
    x = i * spacing[0] + affine[0, 3]
    y = j * spacing[1] + affine[1, 3]
    z = k * spacing[2] + affine[2, 3]

    ext = np.array([shape[a] * spacing[a] for a in range(3)], dtype=float)
    rx, ry, rz = 0.45 * ext[0], 0.48 * ext[1], 0.44 * ext[2]
    s = ext[0] / 160.0

    ellipsoid = (x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2
    brain = ellipsoid < 1
    ventricle = (((np.abs(x) - 11 * s) / (5 * s)) ** 2
                 + ((y - 2 * s) / (27 * s)) ** 2
                 + ((z - 7 * s) / (7 * s)) ** 2) < 1
    depth = 1 - ellipsoid

    tissue = np.full(shape, "", dtype=object)
    tissue[brain] = "white"
    tissue[brain & (depth < 0.2)] = "grey"
    tissue[brain & ventricle] = "csf"
    return x, y, z, brain, tissue, s, rng


def place_lesion(label, tissue, brain, x, y, z, centre, radii):
    """One nested WT/TC/ET lesion at `centre` (mm, in the s-scaled frame
    build_brain uses), with (r_wt, r_tc, r_et) radii in the same units."""
    cx, cy, cz = centre
    r_wt, r_tc, r_et = radii
    r = np.sqrt((x - cx) ** 2 + ((y - cy) * 0.92) ** 2 + ((z - cz) * 1.08) ** 2)
    label[brain & (r < r_wt)] = 2   # ED
    label[brain & (r < r_tc)] = 1   # NCR
    label[brain & (r < r_et)] = 4   # ET
    tissue[label == 1] = "ncr"
    tissue[label == 4] = "et"
    tissue[label == 2] = "ed"


def render_sequences(tissue, brain, rng):
    sequences = {}
    for name in SEQUENCES:
        vol = np.zeros(tissue.shape, dtype=np.float32)
        for key, value in LUT[name].items():
            vol[tissue == key] = value
        vol[brain] += rng.normal(0, 4.0, size=int(brain.sum()))
        sequences[name] = np.clip(vol, 0, None).astype(np.float32)
    return sequences


CASES = [
    {
        "id": "demo_unifocal_right",
        "label": "Unifocal — right frontal",
        "description": "A single, well-circumscribed lesion on the right (+x). The baseline "
                        "case: one connected mass, moderate WT:TC ratio.",
        "lesions": [{"centre": (33.0, 7.0, 13.0), "radii": (21.0, 15.5, 11.5)}],
    },
    {
        "id": "demo_multifocal_left",
        "label": "Multifocal — left hemisphere",
        "description": "Two separate lesions on the left (-x), each independently nested "
                        "WT/TC/ET. Exercises the connectivity analysis's real differentiator: "
                        "\"is it one mass or two?\" answered as 2, not 1.",
        "lesions": [
            {"centre": (-30.0, 14.0, 10.0), "radii": (13.0, 9.0, 6.0)},
            {"centre": (-14.0, -16.0, 2.0), "radii": (10.0, 7.0, 4.5)},
        ],
    },
    {
        "id": "demo_large_diffuse",
        "label": "Large diffuse — extensive oedema",
        "description": "A large whole-tumour extent with a small solid core — a high "
                        "WT:TC ratio, unlike the compact baseline case. Produces a larger, "
                        "more irregular uncertainty footprint at the (now much bigger) boundary.",
        "lesions": [{"centre": (18.0, 10.0, 6.0), "radii": (34.0, 12.0, 6.0)}],
    },
]


def build_demo_case(shape, spacing, seed, lesions):
    x, y, z, brain, tissue, s, rng = build_brain(shape, spacing, seed)
    label = np.zeros(shape, dtype=np.uint8)
    for lesion in lesions:
        cx, cy, cz = lesion["centre"]
        r_wt, r_tc, r_et = lesion["radii"]
        place_lesion(label, tissue, brain, x, y, z, (cx * s, cy * s, cz * s), (r_wt * s, r_tc * s, r_et * s))
    sequences = render_sequences(tissue, brain, rng)
    affine = ras_affine(spacing, shape)
    return sequences, label, affine


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", default=str(BACKEND_ROOT / "samples"))
    p.add_argument("--shape", type=int, nargs=3, default=[160, 192, 160])
    p.add_argument("--seed", type=int, default=0)
    args = p.parse_args()

    out = Path(args.out)
    shape = tuple(args.shape)
    spacing = (1.0, 1.0, 1.0)

    manifest = []
    for idx, case in enumerate(CASES):
        sequences, label, affine = build_demo_case(shape, spacing, args.seed + idx, case["lesions"])
        case_dir = out / case["id"]
        write_study(case_dir, sequences, label, affine, spacing)
        # write_study names the label file "label.nii.gz", matching what the
        # sample-run server endpoint looks for as the optional expert mask.
        manifest.append({
            "id": case["id"],
            "label": case["label"],
            "description": case["description"],
            "source": "synthetic",
            "has_expert": True,
        })
        print(f"  {case['id']}: {len(case['lesions'])} lesion(s) written to {case_dir}")

    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nWrote {len(manifest)} demo case(s) and {out / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
