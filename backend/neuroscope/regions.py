"""BraTS label codes, the nested regions built from them, volumes and metrics."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import ndimage

NCR, ED, ET = 1, 2, 4
REGION_CODES = {"WT": (NCR, ED, ET), "TC": (NCR, ET), "ET": (ET,)}
REGION_ORDER = ("WT", "TC", "ET")


def region_mask(label: np.ndarray, region: str) -> np.ndarray:
    return np.isin(label, REGION_CODES[region])


def regions_to_label(wt: np.ndarray, tc: np.ndarray, et: np.ndarray) -> np.ndarray:
    """Collapse the three nested model outputs back into BraTS codes 0/1/2/4.

    Written outermost first so the inner regions overwrite: anything in WT but
    not TC is oedema, anything in TC but not ET is necrotic core.
    """
    label = np.zeros(wt.shape, dtype=np.uint8)
    label[wt] = ED
    label[tc] = NCR
    label[et] = ET
    return label


def volume_ml(mask: np.ndarray, spacing: tuple[float, float, float]) -> float:
    """voxel count x (dx * dy * dz) / 1000, with 1 mL = 1000 mm^3."""
    return float(mask.sum()) * float(np.prod(spacing)) / 1000.0


@dataclass
class Metric:
    region: str
    dice: float
    sensitivity: float
    intersection: int
    predicted: int
    expert: int

    def as_dict(self) -> dict:
        return {
            "region": self.region,
            "dice": round(self.dice, 4),
            "sensitivity": round(self.sensitivity, 4),
            "intersection_voxels": self.intersection,
            "predicted_voxels": self.predicted,
            "expert_voxels": self.expert,
        }


def compare(pred: np.ndarray, truth: np.ndarray, region: str) -> Metric:
    p = region_mask(pred, region)
    t = region_mask(truth, region)
    inter = int(np.logical_and(p, t).sum())
    np_, nt = int(p.sum()), int(t.sum())

    # An empty region that was correctly predicted empty scores 1, not 0/0.
    dice = 1.0 if np_ + nt == 0 else (2.0 * inter) / (np_ + nt)
    sens = 1.0 if nt == 0 else inter / nt
    return Metric(region, dice, sens, inter, np_, nt)


def score_all(pred: np.ndarray, truth: np.ndarray) -> dict[str, Metric]:
    return {r: compare(pred, truth, r) for r in REGION_ORDER}


@dataclass
class Connectivity:
    """Answers the PS story's own opening question: "is it one mass or two?"."""

    component_count: int
    component_volumes_ml: list[float]  # largest first
    largest_fraction: float  # largest component's share of the region's total voxels

    def as_dict(self) -> dict:
        return {
            "component_count": self.component_count,
            "component_volumes_ml": [round(v, 4) for v in self.component_volumes_ml],
            "largest_fraction": round(self.largest_fraction, 4),
        }


def connectivity(mask: np.ndarray, spacing: tuple[float, float, float]) -> Connectivity:
    """26-connected component analysis (diagonal touches count, since anisotropic
    voxels can make a visually-connected mass look split under 6-connectivity alone)."""
    structure = np.ones((3, 3, 3), dtype=int)
    labelled, n = ndimage.label(mask, structure=structure)
    if n == 0:
        return Connectivity(0, [], 0.0)
    voxel_counts = sorted((int(s) for s in ndimage.sum(mask, labelled, range(1, n + 1))), reverse=True)
    total = sum(voxel_counts)
    voxel_mm3 = float(np.prod(spacing))
    volumes_ml = [count * voxel_mm3 / 1000.0 for count in voxel_counts]
    return Connectivity(n, volumes_ml, (voxel_counts[0] / total) if total else 0.0)


def connectivity_all(label: np.ndarray, spacing: tuple[float, float, float]) -> dict[str, dict]:
    return {r: connectivity(region_mask(label, r), spacing).as_dict() for r in REGION_ORDER}


def volumes_all(label: np.ndarray, spacing: tuple[float, float, float]) -> dict[str, dict]:
    out = {}
    for r in REGION_ORDER:
        mask = region_mask(label, r)
        voxels = int(mask.sum())
        out[r] = {
            "voxels": voxels,
            "volume_ml": round(volume_ml(mask, spacing), 4),
            "formula": f"{voxels} x ({spacing[0]:g} x {spacing[1]:g} x {spacing[2]:g}) / 1000",
        }
    return out
