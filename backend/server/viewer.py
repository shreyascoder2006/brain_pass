"""Build the display-grid binary payload the browser consumes directly.

The browser's client-side meshing/slicing code (src/lib/*) expects uint8
volumes in Fortran order on one shared, axis-aligned grid, plus that grid's
affine as a flat row-major 4x4 (same convention nibabel uses). This mirrors
exactly what the phantom generator already hands the UI, so a live study
drops into the same rendering pipeline with no change there beyond fetching
bytes instead of generating them.
"""

from __future__ import annotations

from pathlib import Path

import nibabel as nib
import numpy as np
from nibabel.processing import resample_from_to, resample_to_output

# Isotropic spacing for the shared display/mesh grid — coarser than the 1mm
# inference grid, which keeps the binary payload small enough for the browser.
DISPLAY_SPACING = 1.5


def _to_uint8(data: np.ndarray) -> np.ndarray:
    nz = data[data != 0]
    lo, hi = np.percentile(nz, [1, 99]) if nz.size else (0.0, 1.0)
    out = np.clip((data - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
    out[data == 0] = 0
    return out


def prepare_viewer(
    images: dict[str, nib.Nifti1Image],
    label: np.ndarray,
    reference: nib.Nifti1Image,
    out: Path,
    expert: np.ndarray | None = None,
) -> dict:
    """Resample sequences + label(s) onto one shared display grid, write .bin payloads.

    `label` and `expert` are BraTS-coded (0/1/2/4) arrays already on `reference`'s grid.
    Returns the geometry (dims/spacing/affine) the frontend needs to interpret them.
    """
    out = Path(out)
    target = resample_to_output(reference, voxel_sizes=(DISPLAY_SPACING,) * 3, order=1)
    grid = (target.shape, target.affine)

    for name, img in images.items():
        data = resample_from_to(img, grid, order=1).get_fdata(dtype=np.float32)
        _to_uint8(data).ravel(order="F").tofile(out / f"{name}.bin")

    label_img = nib.Nifti1Image(label.astype(np.uint8), reference.affine)
    disp_label = resample_from_to(label_img, grid, order=0).get_fdata().astype(np.uint8)
    disp_label.ravel(order="F").tofile(out / "labels.bin")

    if expert is not None:
        expert_img = nib.Nifti1Image(expert.astype(np.uint8), reference.affine)
        disp_expert = resample_from_to(expert_img, grid, order=0).get_fdata().astype(np.uint8)
        disp_expert.ravel(order="F").tofile(out / "expert-labels.bin")

    affine_flat = [float(x) for row in np.asarray(target.affine) for x in row]
    spacing = [float(z) for z in nib.affines.voxel_sizes(target.affine)]
    return {
        "dims": [int(n) for n in target.shape],
        "spacing": spacing,
        "affine": affine_flat,
    }
