"""Model loading and inference.

The MONAI `brats_mri_segmentation` bundle takes four channels at 1 mm in the
order T1Gd, T1, T2, FLAIR and returns three sigmoid channels in the order
TC, WT, ET. Both orders are easy to get wrong and silently produce a plausible
but meaningless mask, so they are named explicitly here rather than inferred.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch

# Channel order the bundle was trained with — NOT alphabetical.
INPUT_ORDER = ("T1Gd", "T1", "T2", "FLAIR")
# Output channel order the bundle emits.
OUTPUT_ORDER = ("TC", "WT", "ET")


@dataclass
class ModelInfo:
    name: str
    version: str
    licence: str
    source: str
    deterministic: bool


class Segmenter:
    """Wraps a loaded network plus the provenance needed for the report."""

    def __init__(self, model, info: ModelInfo, roi=(192, 192, 128), overlap=0.5):
        self.model = model
        self.info = info
        self.roi = roi
        self.overlap = overlap

    @torch.no_grad()
    def __call__(self, channels: np.ndarray, threshold: float = 0.5) -> dict[str, np.ndarray]:
        """channels: (4, X, Y, Z) float32 in INPUT_ORDER. Returns WT/TC/ET boolean."""
        from monai.inferers import sliding_window_inference

        self.model.eval()
        x = torch.from_numpy(channels).unsqueeze(0).float()
        logits = sliding_window_inference(
            inputs=x,
            roi_size=self.roi,
            sw_batch_size=1,
            predictor=self.model,
            overlap=self.overlap,
            mode="gaussian",
        )
        probs = torch.sigmoid(logits)[0].cpu().numpy()

        out = {name: probs[i] >= threshold for i, name in enumerate(OUTPUT_ORDER)}
        # Enforce the nesting the regions are defined by: ET subset of TC subset of WT.
        out["TC"] = np.logical_or(out["TC"], out["ET"])
        out["WT"] = np.logical_or(out["WT"], out["TC"])
        return out


def normalise(volume: np.ndarray) -> np.ndarray:
    """Z-score over the non-zero (in-brain) voxels, as the bundle expects."""
    mask = volume != 0
    if mask.sum() == 0:
        return np.zeros_like(volume, dtype=np.float32)
    values = volume[mask]
    mean, std = float(values.mean()), float(values.std())
    out = np.zeros_like(volume, dtype=np.float32)
    out[mask] = (values - mean) / (std if std > 0 else 1.0)
    return out


def stack_channels(by_sequence: dict[str, np.ndarray]) -> np.ndarray:
    return np.stack([normalise(by_sequence[name]) for name in INPUT_ORDER]).astype(np.float32)


def _bundle_root(bundle_dir: Path) -> Path | None:
    for candidate in (bundle_dir, bundle_dir / "brats_mri_segmentation"):
        if (candidate / "models").is_dir():
            return candidate
    return None


def load_segmenter(bundle_dir: str | Path) -> Segmenter:
    """Load the pretrained SegResNet from a downloaded MONAI bundle.

    If a `model-lock.json` (written by `setup_model.py`) sits next to the
    weights, its pinned sha256 is checked before the checkpoint is loaded.
    No lock file means no verification — this keeps `monai.bundle download`
    working standalone, but `setup_model.py` is the verified path.
    """
    from monai.networks.nets import SegResNet

    root = _bundle_root(Path(bundle_dir))
    if root is None:
        raise FileNotFoundError(
            f"No MONAI bundle under {bundle_dir}. Fetch it with:\n"
            f"  python setup_model.py --bundle-dir {bundle_dir}\n"
            f"(or: python -m monai.bundle download --name brats_mri_segmentation "
            f"--bundle_dir {bundle_dir})"
        )

    weights = next(
        (p for p in [root / "models" / "model.pt", root / "models" / "model.ts"] if p.exists()),
        None,
    )
    if weights is None:
        raise FileNotFoundError(f"Bundle at {root} has no models/model.pt.")

    lock_path = weights.parent / "model-lock.json"
    if lock_path.exists():
        import json

        from .provenance import sha256

        lock = json.loads(lock_path.read_text())
        actual = sha256(weights)
        if actual != lock.get("sha256"):
            raise FileNotFoundError(
                f"Checkpoint at {weights} does not match model-lock.json "
                f"(expected {lock.get('sha256')}, got {actual}). Inference refused — "
                "re-run setup_model.py to re-fetch a verified checkpoint."
            )

    if weights.suffix == ".ts":
        model = torch.jit.load(str(weights), map_location="cpu")
    else:
        model = SegResNet(
            spatial_dims=3,
            blocks_down=[1, 2, 2, 4],
            blocks_up=[1, 1, 1],
            init_filters=16,
            in_channels=4,
            out_channels=3,
            dropout_prob=0.2,
        )
        state = torch.load(str(weights), map_location="cpu", weights_only=False)
        if isinstance(state, dict) and "model" in state:
            state = state["model"]
        model.load_state_dict(state)

    version = "unknown"
    meta = root / "configs" / "metadata.json"
    if meta.exists():
        import json

        try:
            version = json.loads(meta.read_text()).get("version", "unknown")
        except Exception:
            pass

    info = ModelInfo(
        name="MONAI brats_mri_segmentation (SegResNet)",
        version=str(version),
        licence="Apache-2.0",
        source="MONAI Model Zoo, trained on BraTS 2018",
        deterministic=True,
    )
    return Segmenter(model, info)


class HeuristicSegmenter:
    """NOT a segmentation model.

    An intensity rule used only to exercise the pipeline — preprocessing,
    resampling, grid round-trip, writing — when the pretrained bundle is not
    present. Its output is never a clinically or scientifically meaningful mask
    and the report labels it as such.
    """

    info = ModelInfo(
        name="intensity-threshold baseline (NOT a trained model)",
        version="0",
        licence="n/a",
        source="built in; pipeline smoke test only",
        deterministic=True,
    )

    def __call__(self, channels: np.ndarray, threshold: float = 0.5) -> dict[str, np.ndarray]:
        from scipy import ndimage

        t1gd, _t1, _t2, flair = channels
        brain = flair != 0

        wt = np.logical_and(flair > np.quantile(flair[brain], 0.88), brain)
        wt = ndimage.binary_closing(wt, iterations=2)
        wt = ndimage.binary_opening(wt, iterations=2)

        # Keep only the largest connected component.
        lab, n = ndimage.label(wt)
        if n > 1:
            sizes = ndimage.sum(wt, lab, range(1, n + 1))
            wt = lab == (int(np.argmax(sizes)) + 1)

        et = np.logical_and(wt, t1gd > np.quantile(t1gd[brain], 0.985))
        tc = ndimage.binary_closing(np.logical_or(et, ndimage.binary_erosion(wt, iterations=3)), iterations=2)
        tc = np.logical_or(tc, et)
        return {"WT": wt, "TC": np.logical_and(tc, wt), "ET": np.logical_and(et, wt)}
