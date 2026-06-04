"""Speech-to-text utilities backed by Hugging Face Transformers."""

import logging
from functools import cache
from pathlib import Path
from typing import Any, cast

import torch
from transformers import pipeline
from transformers.pipelines import Pipeline

from core.config import WHISPER_MODEL_ID  # noqa: E402 – config sets HF_HOME as side-effect

log = logging.getLogger(__name__)


@cache
def get_transcription_pipeline() -> Pipeline:
    """Create and cache the Hugging Face Whisper ASR pipeline.

    Models are stored in ``backend/.hf_cache/`` (set via ``HF_HOME`` in
    ``core.config``) so subsequent runs load from disk without network requests.

    Returns:
        A cached automatic speech recognition pipeline (OpenAI Whisper tiny).
    """

    log.info("Whisper: loading ASR pipeline  model_id=%r", WHISPER_MODEL_ID)
    device = 0 if torch.cuda.is_available() else -1
    pipe = pipeline(
        task="automatic-speech-recognition",
        model=WHISPER_MODEL_ID,
        device=device,
    )
    log.info("Whisper: pipeline ready  device=%s", "cuda" if device == 0 else "cpu")
    return pipe


def transcribe_audio(audio_path: Path) -> str:
    """Transcribe a WAV audio file with the Whisper ASR model.

    Uses anti-hallucination generation kwargs to prevent the repetition-loop
    bug that causes Whisper to emit "to, to, to, ..." hundreds of times when
    it encounters silence or low-confidence segments at the end of audio.

    Args:
        audio_path: Path to a 16 kHz mono WAV file.

    Returns:
        The transcribed text.

    Raises:
        RuntimeError: If the model response cannot be parsed.
    """

    log.info("Whisper: transcribing  path=%s", audio_path.name)
    transcriber = get_transcription_pipeline()
    result = cast(
        dict[str, Any],
        transcriber(
            str(audio_path),
            return_timestamps=True,
            # Process audio in 30-second chunks for stable long-form transcription
            chunk_length_s=30,
            generate_kwargs={
                # Prevents "to, to, to, ..." infinite n-gram loops
                "no_repeat_ngram_size": 3,
                # Applies a penalty score to tokens already produced
                "repetition_penalty": 1.2,
                # Greedy decoding — more deterministic, less prone to drift
                "temperature": 0.0,
                # Each chunk decoded independently; cross-chunk context is the
                # main trigger for runaway repetition loops in long recordings
                "condition_on_previous_text": False,
            },
        ),
    )
    text = result.get("text")

    if not isinstance(text, str):
        raise RuntimeError("Whisper transcription did not return text.")

    stripped = text.strip()
    log.info("Whisper: transcription complete  chars=%d  preview=%r", len(stripped), stripped[:60])
    return stripped
