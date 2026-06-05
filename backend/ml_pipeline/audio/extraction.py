"""Audio extraction utilities for uploaded interview media."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path

from core.config import FFMPEG_TIMEOUT_SEC

log = logging.getLogger(__name__)

_DECODE_ERROR = (
    "Uploaded media could not be decoded or does not contain a readable audio track."
)
_NO_AUDIO_ERROR = (
    "Uploaded media has no audio track. Record again with microphone access enabled."
)


class AudioExtractionError(RuntimeError):
    """Raised when uploaded media cannot be converted to analysis audio."""


class AudioExtractionTimeoutError(AudioExtractionError):
    """Raised when ffmpeg does not finish within the configured timeout."""


def _run_ffmpeg(command: list[str]) -> subprocess.CompletedProcess[str]:
    """Run an ffmpeg/ffprobe command with a shared timeout."""

    return subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
        timeout=FFMPEG_TIMEOUT_SEC,
    )


def _count_audio_streams(input_path: Path) -> int:
    """Return how many audio streams ffprobe finds in the upload."""

    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "a",
        "-show_entries",
        "stream=index",
        "-of",
        "csv=p=0",
        str(input_path),
    ]
    try:
        result = _run_ffmpeg(command)
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return 0

    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return len(lines)


def _ffmpeg_extract_commands(input_path: Path, output_path: Path) -> list[list[str]]:
    """Build ffmpeg command variants, ordered from strictest to most permissive."""

    output = str(output_path)
    source = str(input_path)
    base_tail = ["-map", "0:a:0?", "-vn", "-c:a", "pcm_s16le", "-ar", "16000", "-ac", "1", output]

    commands: list[list[str]] = [
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", source, *base_tail],
    ]

    if input_path.suffix.lower() == ".webm":
        commands.append(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "webm",
                "-i",
                source,
                *base_tail,
            ],
        )
        commands.append(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-fflags",
                "+discardcorrupt+genpts",
                "-err_detect",
                "ignore_err",
                "-i",
                source,
                *base_tail,
            ],
        )

    return commands


def extract_audio_to_wav(input_path: Path, output_path: Path) -> Path:
    """Extract or normalize uploaded media audio into a 16 kHz mono WAV file.

    Browser ``MediaRecorder`` WebM files may be missing an audio stream or use a
    container that needs permissive decode flags; this helper probes the upload
    first and retries ffmpeg with safer options before failing.

    Args:
        input_path: Path to the uploaded media file.
        output_path: Destination path for the extracted WAV audio.

    Returns:
        The output WAV path.

    Raises:
        AudioExtractionError: If ffmpeg is unavailable or audio extraction fails.
        AudioExtractionTimeoutError: If extraction exceeds the configured timeout.
    """

    if output_path.exists():
        output_path.unlink()

    audio_streams = _count_audio_streams(input_path)
    if audio_streams == 0:
        raise AudioExtractionError(_NO_AUDIO_ERROR)

    last_stderr = ""
    for command in _ffmpeg_extract_commands(input_path, output_path):
        try:
            _run_ffmpeg(command)
        except FileNotFoundError as exc:
            raise AudioExtractionError(
                "ffmpeg is not installed or is not available on PATH.",
            ) from exc
        except subprocess.TimeoutExpired as exc:
            raise AudioExtractionTimeoutError(
                "Media audio extraction timed out.",
            ) from exc
        except subprocess.CalledProcessError as exc:
            last_stderr = (exc.stderr or "").strip()
            log.warning(
                "ffmpeg audio extraction failed for %s: %s",
                input_path.name,
                last_stderr,
            )
            if output_path.exists():
                output_path.unlink()
            continue

        if output_path.exists() and output_path.stat().st_size > 44:
            return output_path

        if output_path.exists():
            output_path.unlink()

    if "does not contain any stream" in last_stderr.lower():
        raise AudioExtractionError(_NO_AUDIO_ERROR)

    raise AudioExtractionError(_DECODE_ERROR)
