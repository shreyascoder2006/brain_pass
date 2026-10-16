"""The one contract every segmentation adapter must satisfy.

`Segmenter` (the real MONAI bundle) and `HeuristicSegmenter` (the pipeline
smoke-test fallback) already happen to share this shape; this module makes
that shape explicit so a future adapter — a second architecture benchmarked
in `docs/IMPLEMENTATION_PLAN.md` Phase 2, or a swapped-in fine-tuned model —
has exactly one interface to satisfy, checked by `isinstance(..., Protocol)`
rather than by convention. Nothing behavioural changes here: this formalises
what already exists in `neuroscope.infer`.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

import numpy as np

from .infer import ModelInfo, Prediction


@runtime_checkable
class SegmenterProtocol(Protocol):
    """Any model adapter the pipeline, the CLI, and the benchmarking harness can call."""

    info: ModelInfo

    def predict(self, channels: np.ndarray, threshold: float = 0.5) -> Prediction:
        """channels: (4, X, Y, Z) float32 in neuroscope.infer.INPUT_ORDER.

        Returns a Prediction with WT/TC/ET regions (nested), per-region mean
        probability, per-region uncertainty (zeros if only one pass ran), and
        the number of passes that produced it.
        """
        ...


def is_segmenter(obj: object) -> bool:
    """Structural check used by the benchmarking harness to validate a candidate
    adapter before running it, rather than letting a missing method fail deep
    inside a pipeline run."""
    return isinstance(obj, SegmenterProtocol)
