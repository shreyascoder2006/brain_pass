"""Tests for neuroscope.validate's all-or-nothing fail-safe gate.

Each test builds the smallest synthetic case that exercises one specific
check, so a change to the validator's logic is caught here directly, rather
than only by the slower, broader judge failure-pack
(`make_testcase.py` / `run_judge_tests.py`).
"""

from __future__ import annotations

from pathlib import Path

import nibabel as nib
import numpy as np
import pytest

from neuroscope.validate import SEQUENCES, validate_label, validate_study


def _affine(spacing=(1.0, 1.0, 1.0), shape=(16, 16, 16)) -> np.ndarray:
    a = np.eye(4)
    for i in range(3):
        a[i, i] = spacing[i]
        a[i, 3] = -(shape[i] - 1) * spacing[i] / 2
    return a


def _save(tmp_path: Path, name: str, data: np.ndarray, affine: np.ndarray) -> Path:
    path = tmp_path / f"{name}.nii.gz"
    nib.save(nib.Nifti1Image(data.astype(np.float32), affine), str(path))
    return path


def _brain_like(shape=(16, 16, 16)) -> np.ndarray:
    """A centred blob with a large zero background, so the fatal checks pass
    and only the (non-fatal) skull-strip/head-shape warnings are at stake."""
    data = np.zeros(shape, dtype=np.float32)
    data[4:12, 4:12, 4:12] = 100.0
    rng = np.random.default_rng(0)
    data[4:12, 4:12, 4:12] += rng.uniform(0, 10, size=(8, 8, 8))
    return data


def _four_sequences(tmp_path: Path, shape=(16, 16, 16), affine=None) -> dict[str, Path]:
    affine = _affine(shape=shape) if affine is None else affine
    return {name: _save(tmp_path, name, _brain_like(shape), affine) for name in SEQUENCES}


def test_consistent_study_passes(tmp_path):
    v = validate_study(_four_sequences(tmp_path))
    assert v.ok, [e.message for e in v.errors]


def test_missing_sequence_fails(tmp_path):
    paths = _four_sequences(tmp_path)
    del paths["FLAIR"]
    v = validate_study(paths)
    assert not v.ok
    assert any(e.code == "incomplete_set" for e in v.errors)


def test_shape_mismatch_fails(tmp_path):
    paths = _four_sequences(tmp_path)
    paths["T2"] = _save(tmp_path, "T2_mismatch", _brain_like((20, 20, 20)), _affine(shape=(20, 20, 20)))
    v = validate_study(paths)
    assert not v.ok
    assert any(e.code == "shape_mismatch" for e in v.errors)


def test_affine_mismatch_fails(tmp_path):
    paths = _four_sequences(tmp_path)
    skewed = _affine()
    skewed[0, 3] += 50  # same shape, different world position
    paths["T2"] = _save(tmp_path, "T2_skewed", _brain_like(), skewed)
    v = validate_study(paths)
    assert not v.ok
    assert any(e.code == "affine_mismatch" for e in v.errors)


def test_nan_values_fail(tmp_path):
    paths = _four_sequences(tmp_path)
    data = _brain_like()
    data[0, 0, 0] = np.nan
    paths["T1"] = _save(tmp_path, "T1_nan", data, _affine())
    v = validate_study(paths)
    assert not v.ok
    assert any(e.code == "not_finite" for e in v.errors)


def test_constant_volume_fails(tmp_path):
    paths = _four_sequences(tmp_path)
    paths["T1"] = _save(tmp_path, "T1_constant", np.zeros((16, 16, 16)), _affine())
    v = validate_study(paths)
    assert not v.ok
    assert any(e.code == "constant" for e in v.errors)


def test_2d_image_fails(tmp_path):
    paths = _four_sequences(tmp_path)
    flat_shape = (16, 16, 1)
    rng = np.random.default_rng(0)
    data = rng.uniform(1, 100, size=flat_shape)  # finite, non-constant, just not 3D
    paths["T1"] = _save(tmp_path, "T1_flat", data, _affine(shape=flat_shape))
    v = validate_study(paths)
    assert not v.ok
    assert any(e.code == "not_3d" for e in v.errors)


def test_singular_affine_fails(tmp_path):
    paths = _four_sequences(tmp_path)
    singular = _affine()
    singular[0, :3] = 0  # zero a row -> determinant 0

    # nib.Nifti1Image's affine setter tries to decompose the affine for qform
    # (polar decomposition), which raises on a singular matrix before the file
    # is even written. set_sform stores the matrix directly, no decomposition,
    # so this is how to get an on-disk file whose *loaded* affine is singular —
    # exactly the case validate.py's own check exists to catch.
    img = nib.Nifti1Image(_brain_like().astype(np.float32), _affine())
    img.set_sform(singular, code=1)
    path = tmp_path / "T1_singular.nii.gz"
    nib.save(img, str(path))
    paths["T1"] = path

    v = validate_study(paths)
    assert not v.ok
    assert any(e.code == "invalid_affine" for e in v.errors)


def test_label_bad_codes_fails(tmp_path):
    grid_shape = (16, 16, 16)
    affine = _affine(shape=grid_shape)
    label = np.zeros(grid_shape, dtype=np.uint8)
    label[0, 0, 0] = 3  # not a valid BraTS 2021 code (1, 2, 4 only)
    path = tmp_path / "label.nii.gz"
    nib.save(nib.Nifti1Image(label, affine), str(path))

    class _Grid:
        shape = grid_shape

    v = validate_label(path, _Grid())
    assert not v.ok
    assert any(e.code == "bad_label_codes" for e in v.errors)


def test_label_shape_mismatch_fails(tmp_path):
    affine = _affine(shape=(16, 16, 16))
    label = np.zeros((16, 16, 16), dtype=np.uint8)
    label[0, 0, 0] = 1
    path = tmp_path / "label.nii.gz"
    nib.save(nib.Nifti1Image(label, affine), str(path))

    class _Grid:
        shape = (20, 20, 20)

    v = validate_label(path, _Grid())
    assert not v.ok
    assert any(e.code == "shape_mismatch" for e in v.errors)
