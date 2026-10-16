"""One settings object instead of scattered `os.environ.get()` calls.

Every env var the server reads was previously looked up inline, at the point
of use, with its own default repeated nowhere else — easy to drift, and
nowhere to see the full list of what's tunable. This names each one once.
Behaviour is unchanged; this is a mechanical consolidation, not a new feature.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]

DEFAULT_JOB_DIR = BACKEND_ROOT / ".runtime" / "jobs"
DEFAULT_BUNDLE_DIR = BACKEND_ROOT / "models"
DEFAULT_TTA_PASSES = 2
DEFAULT_CORS_ORIGINS = ("http://localhost:5173",)
DEFAULT_MAX_UPLOAD_BYTES = 1024 ** 3  # 1 GB per file, matches the validator's own limit
DEFAULT_RETENTION_SECONDS = 23 * 3600
DEFAULT_LOG_LEVEL = "INFO"


@dataclass(frozen=True)
class Settings:
    job_dir: Path = DEFAULT_JOB_DIR
    bundle_dir: Path = DEFAULT_BUNDLE_DIR
    tta_passes: int = DEFAULT_TTA_PASSES
    cors_origins: tuple[str, ...] = DEFAULT_CORS_ORIGINS
    max_upload_bytes: int = DEFAULT_MAX_UPLOAD_BYTES
    retention_seconds: int = DEFAULT_RETENTION_SECONDS
    log_level: str = DEFAULT_LOG_LEVEL

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            job_dir=Path(os.environ.get("NEUROSCOPE_JOB_DIR", str(DEFAULT_JOB_DIR))),
            bundle_dir=Path(os.environ.get("NEUROSCOPE_BUNDLE_DIR", str(DEFAULT_BUNDLE_DIR))),
            tta_passes=int(os.environ.get("NEUROSCOPE_TTA_PASSES", str(DEFAULT_TTA_PASSES))),
            cors_origins=tuple(
                os.environ.get("NEUROSCOPE_CORS_ORIGINS", ",".join(DEFAULT_CORS_ORIGINS)).split(",")
            ),
            max_upload_bytes=DEFAULT_MAX_UPLOAD_BYTES,
            retention_seconds=DEFAULT_RETENTION_SECONDS,
            log_level=os.environ.get("NEUROSCOPE_LOG_LEVEL", DEFAULT_LOG_LEVEL),
        )
