"""Centralized logging configuration for the AI Interview Simulator backend.

Call ``setup_logging()`` once at application startup (in ``main.py``) before
any other module is imported. All modules then obtain their logger via::

    import logging
    log = logging.getLogger(__name__)

Log Levels:
    DEBUG   – fine-grained ML pipeline internals (disabled in production)
    INFO    – normal lifecycle events (startup, model loaded, request handled)
    WARNING – recoverable issues (fallback used, cache miss, slow response)
    ERROR   – exceptions that surface to the caller (with full traceback)
    CRITICAL– unrecoverable startup failures
"""

from __future__ import annotations

import logging
import sys
from typing import Final

# ─── ANSI colour codes ────────────────────────────────────────────────────────

_RESET: Final = "\033[0m"
_BOLD: Final = "\033[1m"
_DIM: Final = "\033[2m"

_LEVEL_COLOURS: Final[dict[str, str]] = {
    "DEBUG":    "\033[36m",   # cyan
    "INFO":     "\033[32m",   # green
    "WARNING":  "\033[33m",   # yellow
    "ERROR":    "\033[31m",   # red
    "CRITICAL": "\033[35m",   # magenta
}


class _ColourFormatter(logging.Formatter):
    """Formatter that adds ANSI colour to level names for terminal output."""

    _FMT: Final = (
        "{dim}%(asctime)s{reset}  "
        "{colour}{bold}%(levelname)-8s{reset}  "
        "{bold}%(name)-40s{reset}  "
        "%(message)s"
    )
    _DATE_FMT: Final = "%Y-%m-%d %H:%M:%S"

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        colour = _LEVEL_COLOURS.get(record.levelname, "")
        fmt = self._FMT.format(
            dim=_DIM,
            bold=_BOLD,
            colour=colour,
            reset=_RESET,
        )
        formatter = logging.Formatter(fmt, datefmt=self._DATE_FMT)
        return formatter.format(record)


class _PlainFormatter(logging.Formatter):
    """Plain formatter for file / non-TTY output (no ANSI codes)."""

    _FMT: Final = "%(asctime)s  %(levelname)-8s  %(name)-40s  %(message)s"
    _DATE_FMT: Final = "%Y-%m-%d %H:%M:%S"

    def __init__(self) -> None:
        super().__init__(fmt=self._FMT, datefmt=self._DATE_FMT)


# ─── Noisy third-party loggers to silence ────────────────────────────────────

_QUIET_LOGGERS: Final[tuple[str, ...]] = (
    "urllib3",
    "urllib3.connectionpool",
    "httpx",
    "httpcore",
    "filelock",
    "fsspec",
    "PIL",
    "h5py",
    "numba",
    "git",
    "absl",
    "tensorboard",
    "torch",
    "torchvision",
    "torchaudio",
    "ultralytics",          # YOLO – very chatty
    "transformers",         # HF – model download progress noise
    "sentence_transformers",
    "huggingface_hub",
)


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logger with coloured console output.

    Args:
        level: Minimum log level for application loggers. Third-party
               noisy loggers are always clamped to WARNING.
    """

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)  # let handlers filter

    # ── Console handler ───────────────────────────────────────────────────────
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(level)
    if sys.stdout.isatty():
        console.setFormatter(_ColourFormatter())
    else:
        console.setFormatter(_PlainFormatter())
    root.addHandler(console)

    # ── Silence noisy third-party libraries ──────────────────────────────────
    for name in _QUIET_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)

    # ── Uvicorn access logs: keep them but suppress its own config ────────────
    logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)

    logging.getLogger(__name__).info(
        "Logging initialised — level=%s", logging.getLevelName(level)
    )
