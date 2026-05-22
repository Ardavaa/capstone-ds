"""Audio extraction utilities for uploaded interview media."""

import subprocess
from pathlib import Path


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
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "ffmpeg is not installed or is not available on PATH.",
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"ffmpeg failed to extract audio: {exc.stderr.strip()}",
        ) from exc

    if not output_path.exists():
        raise RuntimeError(f"ffmpeg did not create an audio file: {result.stderr}")

    return output_path
