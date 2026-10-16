"""Resource budgets shared by the CLI and the live server.

Keeping these in one place means a huge or pathological input fails with a
clear message before it can exhaust memory or blow the 2-minute SLA, instead
of crashing partway through resampling or inference.
"""

from __future__ import annotations

import numpy as np

# Per-sequence voxel cap at load time — generous, catches only pathological files.
MAX_LOAD_VOXELS = 64_000_000

# Cap on the 1mm working grid actually handed to the network. BraTS-sized studies
# (240x240x155 ~= 8.9M voxels) sit well under this; it exists to refuse runaway
# resamples of unusually large or oddly-spaced inputs before they reach the GPU/CPU.
MAX_INFERENCE_VOXELS = 32_000_000


class BudgetExceeded(ValueError):
    """Raised with a message meant to be shown to the user verbatim."""


def check_voxel_budget(shape: tuple[int, int, int], limit: int, context: str) -> None:
    n = int(np.prod(shape))
    if n > limit:
        raise BudgetExceeded(
            f"{context}: {n:,} voxels exceeds the supported budget of {limit:,}."
        )
