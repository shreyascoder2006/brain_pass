"""Fetch a handful of real Task01_BrainTumour cases without downloading the
full 7.6 GB archive.

The official tar is one monolithic file, but tar's own format makes this
possible cheaply: every member is preceded by a fixed 512-byte header that
states that member's exact size, so the whole table of contents can be
walked using one small HTTP Range request per entry (~512 bytes each) — no
payload bytes are transferred for entries we don't want. Once the table of
contents is known, only the N selected cases' actual image+label bytes
(their real, full-resolution NIfTI data) are downloaded in full.

This is a real-data substitute for the full conversion in
`convert_decathlon.py` when bandwidth or time doesn't allow the whole
dataset — explicitly a small, honestly-small sample (N real cases, not a
cohort), never presented as a held-out accuracy benchmark. Output lands in
the same `imagesTr/` + `labelsTr/` + `dataset.json` layout the real archive
uses, so `convert_decathlon.py --root <this output>` runs against it
completely unchanged.

    python backend/tools/fetch_decathlon_sample.py --count 4 --out backend/data/raw_sample
    python backend/tools/convert_decathlon.py --root backend/data/raw_sample/Task01_BrainTumour --out backend/data
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

SOURCE_URL = "https://msd-for-monai.s3-us-west-2.amazonaws.com/Task01_BrainTumour.tar"
HEADER_SIZE = 512
BLOCK = 512


class TarWalkError(RuntimeError):
    pass


def _range_get(url: str, start: int, length: int, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"Range": f"bytes={start}-{start + length - 1}"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _parse_octal(field: bytes) -> int:
    field = field.rstrip(b"\x00 ")
    if not field:
        return 0
    try:
        return int(field, 8)
    except ValueError:
        return 0


def walk_tar_index(url: str, max_entries: int | None, progress_every: int = 40) -> dict[str, tuple[int, int]]:
    """Return {member_name: (payload_offset, payload_size)} by reading only headers."""
    index: dict[str, tuple[int, int]] = {}
    offset = 0
    count = 0
    started = time.time()
    while True:
        header = _range_get(url, offset, HEADER_SIZE)
        if len(header) < HEADER_SIZE or header == b"\x00" * HEADER_SIZE:
            break  # end-of-archive marker
        name = header[0:100].split(b"\x00", 1)[0].decode("utf-8", "replace")
        size = _parse_octal(header[124:136])
        typeflag = header[156:157]
        payload_offset = offset + HEADER_SIZE
        if typeflag in (b"0", b"\x00") and name:
            index[name] = (payload_offset, size)
        offset = payload_offset + ((size + BLOCK - 1) // BLOCK) * BLOCK
        count += 1
        if progress_every and count % progress_every == 0:
            elapsed = time.time() - started
            print(f"  scanned {count} entries ({offset / 1e6:.0f} MB in) — {elapsed:.0f}s — at {name}")
        if max_entries and count >= max_entries:
            break
    return index


def _find_pairs(index: dict[str, tuple[int, int]], count: int) -> list[tuple[str, str, str]]:
    """Return up to `count` (case_id, image_member, label_member) triples."""
    images = {k: k for k in index if "/imagesTr/" in k and k.endswith(".nii.gz") and not Path(k).name.startswith("._")}
    labels = {k: k for k in index if "/labelsTr/" in k and k.endswith(".nii.gz") and not Path(k).name.startswith("._")}

    def case_id(member: str) -> str:
        return Path(member).name.removesuffix(".nii.gz")

    images_by_case = {case_id(m): m for m in images}
    labels_by_case = {case_id(m): m for m in labels}
    shared = sorted(set(images_by_case) & set(labels_by_case))
    return [(cid, images_by_case[cid], labels_by_case[cid]) for cid in shared[:count]]


def _dataset_json_member(index: dict[str, tuple[int, int]]) -> str | None:
    candidates = [k for k in index if k.endswith("dataset.json")]
    return candidates[0] if candidates else None


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--out", required=True, help="Output root; writes <out>/Task01_BrainTumour/...")
    p.add_argument("--count", type=int, default=4, help="Number of real image+label case pairs to fetch.")
    p.add_argument("--url", default=SOURCE_URL)
    p.add_argument(
        "--max-index-entries", type=int, default=0,
        help="Stop walking the table of contents after this many entries (0 = no cap, keep walking "
             "until --count pairs are found or the archive ends). Use this if a run needs to be bounded.",
    )
    p.add_argument(
        "--index-cache", default=None,
        help="Path to save/reuse the walked table-of-contents as JSON, so an interrupted run "
             "doesn't have to re-walk headers already seen.",
    )
    args = p.parse_args()

    out_root = Path(args.out) / "Task01_BrainTumour"

    index: dict[str, tuple[int, int]] = {}
    cache_path = Path(args.index_cache) if args.index_cache else None
    if cache_path and cache_path.exists():
        print(f"Loading cached index from {cache_path}")
        index = {k: tuple(v) for k, v in json.loads(cache_path.read_text()).items()}

    pairs = _find_pairs(index, args.count)
    if len(pairs) < args.count:
        print(f"Walking {args.url} table of contents (header-only, ~{HEADER_SIZE}B per entry)...")
        index.update(walk_tar_index(args.url, args.max_index_entries or None))
        pairs = _find_pairs(index, args.count)
        if cache_path:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_text(json.dumps(index, indent=2))
            print(f"Cached {len(index)} entries to {cache_path}")

    if not pairs:
        print("No complete image+label case pairs found in the scanned portion of the archive.", file=sys.stderr)
        return 1
    if len(pairs) < args.count:
        print(f"Only found {len(pairs)} complete pairs (asked for {args.count}); proceeding with what's available.")

    images_dir = out_root / "imagesTr"
    labels_dir = out_root / "labelsTr"
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)

    dataset_json_member = _dataset_json_member(index)
    if dataset_json_member is None:
        print("dataset.json not found in the scanned table of contents — try a larger --max-index-entries.",
              file=sys.stderr)
        return 1
    offset, size = index[dataset_json_member]
    (out_root / "dataset.json").write_bytes(_range_get(args.url, offset, size))

    total_bytes = 0
    for case_id, image_member, label_member in pairs:
        for member, dest in ((image_member, images_dir / f"{case_id}.nii.gz"),
                              (label_member, labels_dir / f"{case_id}.nii.gz")):
            offset, size = index[member]
            print(f"Fetching {member} ({size / 1e6:.1f} MB)...")
            dest.write_bytes(_range_get(args.url, offset, size))
            total_bytes += size

    print(f"\nFetched {len(pairs)} real case(s): {', '.join(c for c, _, _ in pairs)}")
    print(f"Total downloaded: {total_bytes / 1e6:.1f} MB (vs. 7.6 GB for the full archive)")
    print(f"Wrote {out_root}")
    print(f"Next: python backend/tools/convert_decathlon.py --root {out_root} --out backend/data")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
