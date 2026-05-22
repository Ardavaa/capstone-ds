"""Speech-to-text utilities backed by Hugging Face Transformers."""

from functools import cache
from pathlib import Path
from typing import Any, cast

import torch
from transformers import pipeline
from transformers.pipelines import Pipeline

from core.config import WHISPER_MODEL_ID


@cache
def get_transcription_pipeline() -> Pipeline:
    """Create and cache the Hugging Face Whisper ASR pipeline.

    Returns:
        A cached automatic speech recognition pipeline for Indonesian speech.
    """

    device = 0 if torch.cuda.is_available() else -1
    return pipeline(
        task="automatic-speech-recognition",
        model=WHISPER_MODEL_ID,
        device=device,
    )


def transcribe_audio(audio_path: Path) -> str:
    """Transcribe a WAV audio file with the Indonesian Whisper model.

    Args:
        audio_path: Path to a 16 kHz mono WAV file.

    Returns:
        The transcribed text.

    Raises:
        RuntimeError: If the model response cannot be parsed.
    """

    transcriber = get_transcription_pipeline()
    result = cast(
        dict[str, Any],
        transcriber(str(audio_path), return_timestamps=True),
    )
    text = result.get("text")

    if not isinstance(text, str):
        raise RuntimeError("Whisper transcription did not return text.")

    return text.strip()
