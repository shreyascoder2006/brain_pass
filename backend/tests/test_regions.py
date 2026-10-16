"""Pure-function tests for neuroscope.regions — the formulas behind every
volume, Dice, sensitivity and connectivity number this platform reports.
Catches a threshold or formula regression here, fast, instead of only via
the slower end-to-end judge pack.
"""

from __future__ import annotations

import numpy as np
import pytest

from neuroscope.regions import (
    ED,
    ET,
    NCR,
    compare,
    connectivity,
    region_mask,
    regions_to_label,
    volume_ml,
    volumes_all,
)


def test_region_mask_and_label_round_trip():
    label = np.zeros((4, 4, 4), dtype=np.uint8)
    label[0, 0, 0] = NCR
    label[1, 1, 1] = ED
    label[2, 2, 2] = ET

    wt, tc, et = (region_mask(label, r) for r in ("WT", "TC", "ET"))
    assert wt.sum() == 3           # NCR + ED + ET
    assert tc.sum() == 2           # NCR + ET
    assert et.sum() == 1           # ET only

    rebuilt = regions_to_label(wt, tc, et)
    assert np.array_equal(rebuilt, label)


def test_volume_ml_matches_the_judges_calibration_case():
    # 20x20x20 voxels at 1x1x2 mm -> 16.0 mL, exactly what docs/VERIFICATION.md reports.
    mask = np.ones((20, 20, 20), dtype=bool)
    assert volume_ml(mask, (1.0, 1.0, 2.0)) == pytest.approx(16.0)


def test_compare_perfect_match_scores_one():
    label = np.zeros((5, 5, 5), dtype=np.uint8)
    label[0, 0, 0] = ET
    m = compare(label, label, "ET")
    assert m.dice == pytest.approx(1.0)
    assert m.sensitivity == pytest.approx(1.0)


def test_compare_empty_region_scores_one_not_zero_over_zero():
    label = np.zeros((5, 5, 5), dtype=np.uint8)
    m = compare(label, label, "ET")
    assert m.dice == 1.0
    assert m.sensitivity == 1.0


def test_compare_no_overlap_scores_zero():
    pred = np.zeros((5, 5, 5), dtype=np.uint8)
    pred[0, 0, 0] = ET
    truth = np.zeros((5, 5, 5), dtype=np.uint8)
    truth[4, 4, 4] = ET
    m = compare(pred, truth, "ET")
    assert m.dice == 0.0
    assert m.sensitivity == 0.0


def test_connectivity_single_component():
    mask = np.zeros((10, 10, 10), dtype=bool)
    mask[2:5, 2:5, 2:5] = True
    c = connectivity(mask, (1.0, 1.0, 1.0))
    assert c.component_count == 1
    assert c.largest_fraction == pytest.approx(1.0)


def test_connectivity_two_equal_disconnected_components():
    # Answers the PS's own opening question: "is it one mass or two?"
    mask = np.zeros((10, 10, 10), dtype=bool)
    mask[0:2, 0:2, 0:2] = True
    mask[8:10, 8:10, 8:10] = True
    c = connectivity(mask, (1.0, 1.0, 1.0))
    assert c.component_count == 2
    assert c.largest_fraction == pytest.approx(0.5)


def test_connectivity_empty_mask():
    mask = np.zeros((5, 5, 5), dtype=bool)
    c = connectivity(mask, (1.0, 1.0, 1.0))
    assert c.component_count == 0
    assert c.component_volumes_ml == []
    assert c.largest_fraction == 0.0


def test_volumes_all_reports_formula_inline():
    label = np.zeros((2, 2, 2), dtype=np.uint8)
    label[0, 0, 0] = ET
    out = volumes_all(label, (1.0, 1.0, 1.0))
    assert out["ET"]["voxels"] == 1
    assert "x" in out["ET"]["formula"]
    assert out["ET"]["volume_ml"] == pytest.approx(0.001)
