"""Reading and writing NIfTI while keeping the input grid and affine authoritative.

Every prediction has to land back on the grid and affine the caller handed us.
Doing the reorientation here, once, is what makes the orientation tests behave:
a volume stored flipped *with* a matching affine describes the same anatomy and
must come back identical, while a volume flipped *without* an affine change
describes mirrored anatomy and must come back mirrored.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import nibabel as nib
import numpy as np
from nibabel.processing import resample_from_to

MAX_BYTES = 1024 ** 3  # 1 GB


@dataclass(frozen=True)
class Grid:
    """The geometry a result must be written back onto."""

    shape: tuple[int, int, int]
    affine: np.ndarray

    def matches(self, other: "Grid", tol: float = 1e-4) -> bool:
        return self.shape == other.shape and np.allclose(self.affine, other.affine, atol=tol)


@dataclass
class Volume:
    image: nib.Nifti1Image
    path: Path

    @property
    def grid(self) -> Grid:
        return Grid(tuple(int(n) for n in self.image.shape[:3]), np.asarray(self.image.affine))

    @property
    def spacing(self) -> tuple[float, float, float]:
        return tuple(float(z) for z in self.image.header.get_zooms()[:3])

    def data(self) -> np.ndarray:
        return np.asanyarray(self.image.dataobj, dtype=np.float32)


class NiftiError(ValueError):
    """Raised with a message meant to be shown to the user verbatim."""


def load(path: str | Path) -> Volume:
    path = Path(path)
    if not path.exists():
        raise NiftiError(f"{path.name}: file not found.")

    size = path.stat().st_size
    if size > MAX_BYTES:
        raise NiftiError(
            f"{path.name}: file is {size / 1024 ** 3:.2f} GB, over the 1 GB limit."
        )
    if size == 0:
        raise NiftiError(f"{path.name}: file is empty.")

    try:
        image = nib.load(str(path))
        image.header  # forces the header to parse
    except nib.filebasedimages.ImageFileError as exc:
        raise NiftiError(
            f"{path.name}: not a readable NIfTI file ({exc.__class__.__name__}). "
            "The extension says NIfTI but the contents do not."
        ) from exc
    except (OSError, EOFError, Exception) as exc:  # gzip and truncation surface here
        name = exc.__class__.__name__
        if "gzip" in str(exc).lower() or name in {"BadGzipFile", "EOFError"}:
            raise NiftiError(f"{path.name}: gzip stream is corrupt and cannot be decompressed.") from exc
        raise NiftiError(f"{path.name}: could not be read ({name}: {exc}).") from exc

    if not isinstance(image, (nib.Nifti1Image, nib.Nifti2Image)):
        raise NiftiError(f"{path.name}: not a NIfTI image (got {type(image).__name__}).")

    return Volume(image=image, path=path)


def to_canonical(image: nib.Nifti1Image) -> nib.Nifti1Image:
    """Reorient to closest-RAS. Anatomy is preserved; only storage order changes."""
    return nib.as_closest_canonical(image)


def resample_to_spacing(
    image: nib.Nifti1Image, spacing: float = 1.0, order: int = 1
) -> nib.Nifti1Image:
    """Resample onto an isotropic grid of the given spacing, keeping world position."""
    zooms = np.asarray(image.header.get_zooms()[:3], dtype=float)
    shape = np.asarray(image.shape[:3], dtype=float)
    target_shape = np.maximum(1, np.ceil(shape * zooms / spacing)).astype(int)

    affine = np.asarray(image.affine, dtype=float).copy()
    scale = np.diag([spacing / z if z else 1.0 for z in zooms] + [1.0])
    target_affine = affine @ scale

    return resample_from_to(image, (tuple(target_shape), target_affine), order=order)


def resample_onto(image: nib.Nifti1Image, grid: Grid, order: int = 0) -> nib.Nifti1Image:
    """Put an image back onto a target grid. order=0 keeps label values intact."""
    return resample_from_to(image, (grid.shape, grid.affine), order=order)


def save_label(
    data: np.ndarray, grid: Grid, path: str | Path, reference: nib.Nifti1Image | None = None
) -> Path:
    """Write a BraTS-coded label map (0/1/2/4) on the given grid."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    out = nib.Nifti1Image(data.astype(np.uint8), grid.affine)
    out.header.set_data_dtype(np.uint8)
    if reference is not None:
        zooms = reference.header.get_zooms()[:3]
        out.header.set_zooms(tuple(float(z) for z in zooms))
        # Keep the caller's sform/qform codes so the geometry round-trips unchanged.
        out.set_sform(grid.affine, code=int(reference.header["sform_code"]) or 1)
        out.set_qform(grid.affine, code=int(reference.header["qform_code"]) or 1)
    nib.save(out, str(path))
    return path
