"""Audio extraction utilities for uploaded interview media."""

import subprocess
from pathlib import Path

from core.config import FFMPEG_TIMEOUT_SEC


class AudioExtractionError(RuntimeError):
    """Raised when uploaded media cannot be converted to analysis audio."""


class AudioExtractionTimeoutError(AudioExtractionError):
    """Raised when ffmpeg does not finish within the configured timeout."""


def extract_audio_to_wav(input_path: Path, output_path: Path) -> Path:
    """Extract or normalize uploaded media audio into a 16 kHz mono WAV file.

    Args:
        input_path: Path to the uploaded `.mp4` or `.wav` file.
        output_path: Destination path for the extracted WAV audio.

    Returns:
        The output WAV path.

    Raises:
        RuntimeError: If `ffmpeg` is unavailable or audio extraction fails.
    """

    command = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(input_path),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        str(output_path),
    ]

    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            timeout=FFMPEG_TIMEOUT_SEC,
        )
    except FileNotFoundError as exc:
        raise AudioExtractionError(
            "ffmpeg is not installed or is not available on PATH.",
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise AudioExtractionTimeoutError(
            "Media audio extraction timed out.",
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise AudioExtractionError(
            "Uploaded media could not be decoded or does not contain a readable audio track.",
        ) from exc

    if not output_path.exists():
        raise AudioExtractionError("ffmpeg did not create an audio file.")

    return output_path
