"""The adapter Protocol formalized in neuroscope.model_base — checked against
both real adapters, not just asserted by convention."""

from __future__ import annotations

from neuroscope.infer import HeuristicSegmenter, ModelInfo, Segmenter
from neuroscope.model_base import is_segmenter


def test_heuristic_segmenter_satisfies_protocol():
    assert is_segmenter(HeuristicSegmenter())


def test_bundle_segmenter_satisfies_protocol():
    info = ModelInfo(name="test", version="0", licence="Apache-2.0", source="test", deterministic=True)
    # A dummy `model` is enough — predict() is never called, only the shape is checked.
    seg = Segmenter(model=object(), info=info)
    assert is_segmenter(seg)


def test_non_segmenter_fails_protocol():
    assert not is_segmenter(object())
    assert not is_segmenter("not a segmenter")
