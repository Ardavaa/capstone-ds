"""Speech-to-text utilities backed by faster-whisper."""

import logging
from functools import cache
from pathlib import Path

import torch
from faster_whisper import WhisperModel

from core.config import HF_CACHE_DIR, WHISPER_MODEL_ID  # noqa: E402 – config sets HF_HOME as side-effect

log = logging.getLogger(__name__)


@cache
def get_transcription_pipeline() -> WhisperModel:
    """Create and cache the faster-whisper WhisperModel instance.

    Models are stored in ``backend/.hf_cache/faster-whisper`` so subsequent runs
    load from disk without network requests.

    Returns:
        A cached faster-whisper WhisperModel.
    """

    log.info("Whisper: loading faster-whisper model  model_id=%r", WHISPER_MODEL_ID)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    # Use float16 on GPU for maximum performance, int8 on CPU for efficiency.
    compute_type = "float16" if device == "cuda" else "int8"

    model = WhisperModel(
        WHISPER_MODEL_ID,
        device=device,
        compute_type=compute_type,
        download_root=str(HF_CACHE_DIR / "faster-whisper"),
    )
    log.info("Whisper: model ready  device=%s  compute_type=%s", device, compute_type)
    return model


def transcribe_audio(audio_path: Path) -> str:
    """Transcribe a WAV audio file with faster-whisper.

    Args:
        audio_path: Path to a 16 kHz mono WAV file.

    Returns:
        The transcribed text.

    Raises:
        RuntimeError: If transcription fails.
    """

    log.info("Whisper: transcribing  path=%s", audio_path.name)
    model = get_transcription_pipeline()

    # transcribe returns a generator of segments and transcription info.
    segments, info = model.transcribe(
        str(audio_path),
        beam_size=5,
        temperature=0.0,
        repetition_penalty=1.2,
        no_repeat_ngram_size=3,
    )

    # Consume the generator to get full transcription text
    text_segments = []
    for segment in segments:
        text_segments.append(segment.text)

    full_text = "".join(text_segments)
    stripped = full_text.strip()

    log.info("Whisper: transcription complete  chars=%d  preview=%r", len(stripped), stripped[:60])
    return stripped
