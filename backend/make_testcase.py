"""Generate synthetic NIfTI studies, including the judges' calibration cases.

    python make_testcase.py --out ./testdata

Produces:
  case/          a normal four-sequence study with an expert mask
  cube/          the volume calibration case: a 20x20x20 block coded 2 at
                 1x1x2 mm spacing, which must read WT = 16.0 mL
  aniso/         the same case with every second axial slice removed
  flip_affine/   voxels mirrored L-R with the affine changed to match
                 (same anatomy — the tumour must stay on the same side)
  flip_voxels/   voxels mirrored L-R with the affine unchanged
                 (mirrored anatomy — the tumour must move to the other side)
  broken/        the eight-case failure pack
"""

from __future__ import annotations

import argparse
import gzip
from pathlib import Path

import nibabel as nib
import numpy as np

SEQUENCES = ("T1", "T1Gd", "T2", "FLAIR")
# tissue -> intensity per sequence
LUT = {
    "T1":    {"csf": 40, "grey": 110, "white": 155, "ncr": 62, "et": 104, "ed": 96},
    "T1Gd":  {"csf": 42, "grey": 112, "white": 157, "ncr": 58, "et": 232, "ed": 100},
    "T2":    {"csf": 196, "grey": 120, "white": 82, "ncr": 178, "et": 150, "ed": 212},
    "FLAIR": {"csf": 28, "grey": 126, "white": 95, "ncr": 148, "et": 158, "ed": 226},
}


def ras_affine(spacing, shape):
    a = np.eye(4)
    for i in range(3):
        a[i, i] = spacing[i]
        a[i, 3] = -(shape[i] - 1) * spacing[i] / 2
    return a


def build_case(shape=(160, 192, 160), spacing=(1.0, 1.0, 1.0), seed=0):
    rng = np.random.default_rng(seed)
    affine = ras_affine(spacing, shape)

    i, j, k = np.meshgrid(*[np.arange(n) for n in shape], indexing="ij")
    x = i * spacing[0] + affine[0, 3]
    y = j * spacing[1] + affine[1, 3]
    z = k * spacing[2] + affine[2, 3]

    # Size the head to the volume so there is always real background around it;
    # a brain clipped by the field of view is not skull-stripped-looking data.
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

    # Tumour on the RIGHT (+x in RAS), so the orientation tests have a clear answer.
    cx, cy, cz = 33.0 * s, 7.0 * s, 13.0 * s
    r = np.sqrt((x - cx) ** 2 + ((y - cy) * 0.92) ** 2 + ((z - cz) * 1.08) ** 2)
    label = np.zeros(shape, dtype=np.uint8)
    label[brain & (r < 21.0 * s)] = 2
    label[brain & (r < 15.5 * s)] = 4
    label[brain & (r < 11.5 * s)] = 1

    tissue[label == 1] = "ncr"
    tissue[label == 4] = "et"
    tissue[label == 2] = "ed"

    sequences = {}
    for name in SEQUENCES:
        vol = np.zeros(shape, dtype=np.float32)
        for key, value in LUT[name].items():
            vol[tissue == key] = value
        vol[brain] += rng.normal(0, 4.0, size=int(brain.sum()))
        sequences[name] = np.clip(vol, 0, None).astype(np.float32)

    return sequences, label, affine


def write_study(folder: Path, sequences, label, affine, spacing):
    folder.mkdir(parents=True, exist_ok=True)
    for name, vol in sequences.items():
        img = nib.Nifti1Image(vol.astype(np.float32), affine)
        img.header.set_zooms(tuple(float(s) for s in spacing))
        nib.save(img, str(folder / f"{name}.nii.gz"))
    if label is not None:
        img = nib.Nifti1Image(label.astype(np.uint8), affine)
        img.header.set_zooms(tuple(float(s) for s in spacing))
        nib.save(img, str(folder / "label.nii.gz"))


def make_cube(out: Path):
    """20x20x20 voxels coded 2, spacing 1x1x2 mm -> 8000 * 2 mm^3 = 16.0 mL."""
    shape = (64, 64, 48)
    spacing = (1.0, 1.0, 2.0)
    affine = ras_affine(spacing, shape)

    label = np.zeros(shape, dtype=np.uint8)
    label[22:42, 22:42, 14:34] = 2

    sequences = {}
    rng = np.random.default_rng(7)
    for name in SEQUENCES:
        vol = np.zeros(shape, dtype=np.float32)
        vol[8:56, 8:56, 6:42] = LUT[name]["white"]
        vol[label == 2] = LUT[name]["ed"]
        vol += rng.normal(0, 2.0, size=shape)
        sequences[name] = np.clip(vol, 0, None).astype(np.float32)

    write_study(out, sequences, label, affine, spacing)
    voxels = int((label == 2).sum())
    print(f"  cube: {voxels} voxels x {np.prod(spacing):g} mm^3 = "
          f"{voxels * np.prod(spacing) / 1000:.2f} mL (expect 16.00)")


def make_broken(out: Path, sequences, label, affine, spacing):
    out.mkdir(parents=True, exist_ok=True)

    # 1. not a NIfTI at all, but named .nii.gz
    (out / "not_nifti.nii.gz").write_bytes(b"This is a plain text file, not an image.\n" * 64)

    # 2. corrupt gzip: valid header, truncated payload
    good = gzip.compress(b"\x00" * 4096)
    (out / "corrupt_gzip.nii.gz").write_bytes(good[: len(good) // 2])

    # 3. a 2D image
    img2d = nib.Nifti1Image(np.zeros((64, 64), dtype=np.float32) + 5, np.eye(4))
    nib.save(img2d, str(out / "two_d.nii.gz"))

    # 4. all zeros
    nib.save(nib.Nifti1Image(np.zeros(sequences["T1"].shape, np.float32), affine),
             str(out / "all_zero.nii.gz"))

    # 5. NaN values
    nan_vol = sequences["T1"].copy()
    nan_vol[10:20, 10:20, 10:20] = np.nan
    nib.save(nib.Nifti1Image(nan_vol, affine), str(out / "has_nan.nii.gz"))

    # 6. mismatched shape
    nib.save(nib.Nifti1Image(sequences["T1"][:-8].copy(), affine),
             str(out / "wrong_shape.nii.gz"))

    # 7. mismatched affine (shifted 10 mm, same shape)
    shifted = affine.copy()
    shifted[0, 3] += 10.0
    nib.save(nib.Nifti1Image(sequences["T1"].copy(), shifted),
             str(out / "wrong_affine.nii.gz"))

    print("  broken/: 7 files written (the >1 GB case is checked by file size, "
          "not generated here)")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", default="./testdata")
    p.add_argument("--shape", type=int, nargs=3, default=[160, 192, 160])
    args = p.parse_args()

    out = Path(args.out)
    shape = tuple(args.shape)
    spacing = (1.0, 1.0, 1.0)

    print("Generating synthetic study…")
    sequences, label, affine = build_case(shape, spacing)
    write_study(out / "case", sequences, label, affine, spacing)
    print(f"  case/: {shape} at {spacing} mm, tumour on the RIGHT (+x)")

    # Anisotropic: drop every second axial slice.
    aniso_affine = affine.copy()
    aniso_affine[:3, 2] *= 2
    write_study(
        out / "aniso",
        {n: v[:, :, ::2].copy() for n, v in sequences.items()},
        label[:, :, ::2].copy(),
        aniso_affine,
        (spacing[0], spacing[1], spacing[2] * 2),
    )
    print("  aniso/: every second axial slice removed")

    # Same anatomy: flip voxels AND flip the affine's x column to match.
    flip_affine = affine.copy()
    flip_affine[:3, 0] *= -1
    flip_affine[0, 3] = -affine[0, 3] - (shape[0] - 1) * affine[0, 0] * -1
    flip_affine[0, 3] = affine[0, 3] + (shape[0] - 1) * affine[0, 0]
    write_study(
        out / "flip_affine",
        {n: v[::-1].copy() for n, v in sequences.items()},
        label[::-1].copy(),
        flip_affine,
        spacing,
    )
    print("  flip_affine/: same anatomy, stored mirrored (tumour must stay RIGHT)")

    # Mirrored anatomy: flip voxels, leave the affine alone.
    write_study(
        out / "flip_voxels",
        {n: v[::-1].copy() for n, v in sequences.items()},
        label[::-1].copy(),
        affine,
        spacing,
    )
    print("  flip_voxels/: mirrored anatomy (tumour must move LEFT)")

    make_cube(out / "cube")
    make_broken(out / "broken", sequences, label, affine, spacing)
    print(f"\nWrote {out.resolve()}")


if __name__ == "__main__":
    main()
