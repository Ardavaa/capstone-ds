"""
Ekstraksi Audio
Mengekstrak dan menormalisasi trek audio dari berkas media menjadi format WAV mono 16 kHz.
"""

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
    """Kesalahan umum ketika ekstraksi audio gagal."""

class AudioExtractionTimeoutError(AudioExtractionError):
    """Kesalahan ketika proses ffmpeg memakan waktu terlalu lama."""

def _run_ffmpeg(command: list[str]) -> subprocess.CompletedProcess[str]:
    """Menjalankan perintah ffmpeg/ffprobe dengan timeout yang disetel."""
    return subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
        timeout=FFMPEG_TIMEOUT_SEC,
    )

def _count_audio_streams(input_path: Path) -> int:
    """Menghitung berapa banyak trek audio yang ada di dalam berkas media."""
    command = [
        "ffprobe", "-v", "error", "-select_streams", "a",
        "-show_entries", "stream=index", "-of", "csv=p=0",
        str(input_path),
    ]
    try:
        result = _run_ffmpeg(command)
        lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        return len(lines)
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return 0

def _ffmpeg_extract_commands(input_path: Path, output_path: Path) -> list[list[str]]:
    """Membuat daftar variasi perintah ffmpeg dari yang paling ketat hingga longgar."""
    output = str(output_path)
    source = str(input_path)
    # Parameter dasar: tanpa video (-vn), codec pcm 16-bit, sample rate 16000, 1 channel (mono)
    base_params = ["-map", "0:a:0?", "-vn", "-c:a", "pcm_s16le", "-ar", "16000", "-ac", "1", output]

    commands: list[list[str]] = [
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", source, *base_params],
    ]

    # WebM membutuhkan penanganan khusus jika metadata rusak
    if input_path.suffix.lower() == ".webm":
        commands.append(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "webm", "-i", source, *base_params]
        )
        commands.append(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-fflags", "+discardcorrupt+genpts", "-err_detect", "ignore_err",
                "-i", source, *base_params
            ]
        )

    return commands

def extract_audio_to_wav(input_path: Path, output_path: Path) -> Path:
    """Mengekstrak trek audio dari video/audio unggahan kandidat ke berkas WAV mono 16 kHz."""
    if output_path.exists():
        output_path.unlink()

    # Validasi apakah berkas memiliki suara
    if _count_audio_streams(input_path) == 0:
        raise AudioExtractionError(_NO_AUDIO_ERROR)

    last_stderr = ""
    for command in _ffmpeg_extract_commands(input_path, output_path):
        try:
            _run_ffmpeg(command)
        except FileNotFoundError as exc:
            raise AudioExtractionError("ffmpeg is not installed or is not available on PATH.") from exc
        except subprocess.TimeoutExpired as exc:
            raise AudioExtractionTimeoutError("Media audio extraction timed out.") from exc
        except subprocess.CalledProcessError as exc:
            last_stderr = (exc.stderr or "").strip()
            log.warning("ffmpeg gagal untuk %s: %s", input_path.name, last_stderr)
            if output_path.exists():
                output_path.unlink()
            continue

        # Jika berhasil mengekstrak berkas audio yang valid
        if output_path.exists() and output_path.stat().st_size > 44:
            return output_path

        if output_path.exists():
            output_path.unlink()

    if "does not contain any stream" in last_stderr.lower():
        raise AudioExtractionError(_NO_AUDIO_ERROR)

    raise AudioExtractionError(_DECODE_ERROR)
