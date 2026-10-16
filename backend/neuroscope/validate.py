"""Input validation. Nothing downstream runs unless every check here passes.

The rule is that a set is either wholly usable or wholly rejected — a partially
valid study must never produce a result, because a result implies the geometry
and the volumes can be trusted.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from .nifti_io import NiftiError, Volume, load

SEQUENCES = ("T1", "T1Gd", "T2", "FLAIR")


@dataclass
class Finding:
    code: str
    message: str
    sequence: str | None = None
    fatal: bool = True


@dataclass
class Validation:
    findings: list[Finding] = field(default_factory=list)
    volumes: dict[str, Volume] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return not any(f.fatal for f in self.findings)

    @property
    def warnings(self) -> list[Finding]:
        return [f for f in self.findings if not f.fatal]

    @property
    def errors(self) -> list[Finding]:
        return [f for f in self.findings if f.fatal]

    def fail(self, code: str, message: str, sequence: str | None = None) -> None:
        self.findings.append(Finding(code, message, sequence, fatal=True))

    def warn(self, code: str, message: str, sequence: str | None = None) -> None:
        self.findings.append(Finding(code, message, sequence, fatal=False))


def _check_array(v: Validation, name: str, vol: Volume) -> bool:
    shape = vol.image.shape
    if len(shape) < 3 or (len(shape) > 3 and any(n > 1 for n in shape[3:])):
        v.fail("not_3d", f"{name}: expected a 3D volume, got shape {tuple(shape)}.", name)
        return False
    if any(n < 2 for n in shape[:3]):
        v.fail("not_3d", f"{name}: a 2D image was supplied (shape {tuple(shape)}).", name)
        return False

    data = vol.data()
    if not np.all(np.isfinite(data)):
        n_nan = int(np.isnan(data).sum())
        n_inf = int(np.isinf(data).sum())
        v.fail(
            "not_finite",
            f"{name}: contains {n_nan} NaN and {n_inf} infinite voxels.",
            name,
        )
        return False

    lo, hi = float(data.min()), float(data.max())
    if lo == hi:
        v.fail(
            "constant",
            f"{name}: every voxel has the same value ({lo:g}); the volume carries no image.",
            name,
        )
        return False

    return True


def _looks_skull_stripped(data: np.ndarray) -> tuple[bool, float]:
    """BraTS volumes are skull-stripped, so the background is exactly zero and large."""
    zero_fraction = float((data == 0).sum()) / data.size
    return zero_fraction > 0.35, zero_fraction


def _looks_like_a_head(data: np.ndarray) -> tuple[bool, str]:
    """Cheap shape sanity: the non-zero mass should be one blob near the centre."""
    mask = data > (data.max() * 0.08)
    if mask.sum() == 0:
        return False, "no tissue above the noise floor"

    coords = np.argwhere(mask)
    centre = coords.mean(axis=0)
    extent = np.asarray(mask.shape, dtype=float)
    offset = np.abs(centre - extent / 2) / extent
    if np.any(offset > 0.28):
        return False, "the imaged object is far off-centre for a head"

    span = (coords.max(axis=0) - coords.min(axis=0) + 1) / extent
    if np.any(span < 0.25):
        return False, "the imaged object is too flat in one axis to be a head"

    fill = mask.sum() / float(np.prod(coords.max(axis=0) - coords.min(axis=0) + 1))
    if fill < 0.25:
        return False, "the imaged object is too sparse to be a brain"

    return True, ""


def validate_study(paths: dict[str, str | Path]) -> Validation:
    """Validate a four-sequence study plus geometry agreement across it."""
    v = Validation()

    missing = [s for s in SEQUENCES if s not in paths or paths[s] is None]
    if missing:
        v.fail(
            "incomplete_set",
            f"Need all four sequences; missing {', '.join(missing)}. "
            f"Got {len(SEQUENCES) - len(missing)} of 4.",
        )

    for name in SEQUENCES:
        p = paths.get(name)
        if p is None:
            continue
        try:
            vol = load(p)
        except NiftiError as exc:
            v.fail("unreadable", str(exc), name)
            continue
        if _check_array(v, name, vol):
            v.volumes[name] = vol

    if not v.ok:
        return v

    reference_name = "T1Gd" if "T1Gd" in v.volumes else next(iter(v.volumes))
    reference = v.volumes[reference_name].grid

    for name, vol in v.volumes.items():
        grid = vol.grid
        if grid.shape != reference.shape:
            v.fail(
                "shape_mismatch",
                f"{name}: shape {grid.shape} does not match {reference_name} {reference.shape}. "
                "The four sequences must be co-registered on one grid.",
                name,
            )
        elif not np.allclose(grid.affine, reference.affine, atol=1e-3):
            worst = float(np.abs(grid.affine - reference.affine).max())
            v.fail(
                "affine_mismatch",
                f"{name}: affine differs from {reference_name} by up to {worst:.3g}. "
                "The sequences describe different positions in world space.",
                name,
            )

    if not v.ok:
        return v

    for name, vol in v.volumes.items():
        data = vol.data()
        stripped, zero_fraction = _looks_skull_stripped(data)
        if not stripped:
            v.warn(
                "not_skull_stripped",
                f"{name}: only {zero_fraction:.0%} of voxels are exactly zero. This set does "
                "not look skull-stripped; the model was trained on skull-stripped BraTS data "
                "and its output here is unreliable.",
                name,
            )
        head, why = _looks_like_a_head(data)
        if not head:
            v.warn(
                "out_of_distribution",
                f"{name}: does not look like a brain MRI — {why}.",
                name,
            )

    return v


def validate_label(path: str | Path, grid) -> Validation:
    """Validate an optional expert mask against the study grid."""
    v = Validation()
    try:
        vol = load(path)
    except NiftiError as exc:
        v.fail("unreadable", str(exc), "label")
        return v

    if not _check_array(v, "label", vol):
        return v

    if vol.grid.shape != grid.shape:
        v.fail(
            "shape_mismatch",
            f"label: shape {vol.grid.shape} does not match the study {grid.shape}.",
            "label",
        )
        return v

    codes = set(np.unique(vol.data()).astype(int).tolist())
    unexpected = codes - {0, 1, 2, 4}
    if unexpected:
        v.fail(
            "bad_label_codes",
            f"label: contains codes {sorted(unexpected)}; BraTS 2021 uses 1 (NCR), "
            "2 (ED) and 4 (ET) only.",
            "label",
        )
        return v

    v.volumes["label"] = vol
    return v
