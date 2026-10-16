"""Fetch the pretrained MONAI bundle and pin its checkpoint hash.

Downloads `brats_mri_segmentation` via MONAI's own bundle downloader, then
writes `models/brats_mri_segmentation/models/model-lock.json` with the
checkpoint's sha256. `neuroscope.infer.load_segmenter` verifies the weights
against that lock file before every load, so a corrupted or swapped
checkpoint is refused rather than silently used.

    python setup_model.py [--bundle-dir backend/models]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from neuroscope.infer import _bundle_root
from neuroscope.provenance import sha256

BUNDLE_NAME = "brats_mri_segmentation"


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--bundle-dir", default=str(Path(__file__).parent / "models"))
    args = p.parse_args()

    bundle_dir = Path(args.bundle_dir)
    bundle_dir.mkdir(parents=True, exist_ok=True)

    root = _bundle_root(bundle_dir)
    if root is None:
        print(f"Downloading {BUNDLE_NAME} into {bundle_dir} ...")
        from monai.bundle import download

        download(name=BUNDLE_NAME, bundle_dir=str(bundle_dir))
        root = _bundle_root(bundle_dir)
        if root is None:
            print("ERROR: download completed but no models/ directory was found.", file=sys.stderr)
            return 1
    else:
        print(f"Bundle already present at {root}.")

    weights = next((p for p in [root / "models" / "model.pt", root / "models" / "model.ts"] if p.exists()), None)
    if weights is None:
        print(f"ERROR: {root} has no models/model.pt or model.ts.", file=sys.stderr)
        return 1

    digest = sha256(weights)
    lock = {"bundle": BUNDLE_NAME, "weights": weights.name, "sha256": digest}
    lock_path = weights.parent / "model-lock.json"
    lock_path.write_text(json.dumps(lock, indent=2))

    print(f"Verified checkpoint: {weights}")
    print(f"sha256: {digest}")
    print(f"Wrote {lock_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
