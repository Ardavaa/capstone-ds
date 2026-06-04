"""Voice emotion analysis (Speech Emotion Recognition) for interview audio."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any, cast

import librosa
import numpy as np
import torch
from transformers import pipeline
from transformers.pipelines import Pipeline

from core.config import (  # noqa: E402 – config sets HF_HOME as side-effect
    EMOTION_CHUNK_SEC,
    EMOTION_DELIVERY_BLEND_WEIGHT,
    EMOTION_MIN_CHUNK_SEC,
    EMOTION_MODEL_ID,
    EMOTION_SAMPLE_RATE,
    PAUSE_TOP_DB,
)

log = logging.getLogger(__name__)

# Interview-friendly valence per normalized emotion label (0–1).
_EMOTION_VALENCE: dict[str, float] = {
    "neutral": 1.0,
    "neu": 1.0,
    "calm": 1.0,
    "happy": 0.95,
    "hap": 0.95,
    "surprised": 0.75,
    "sur": 0.75,
    "sad": 0.35,
    "angry": 0.25,
    "ang": 0.25,
    "fearful": 0.30,
    "fear": 0.30,
    "disgust": 0.20,
    "dis": 0.20,
}

_NERVOUS_LABELS: frozenset[str] = frozenset(
    {"sad", "angry", "ang", "fearful", "fear", "disgust", "dis"},
)

_DEFAULT_EMOTION = "neutral"


@dataclass(frozen=True)
class EmotionAnalysisResult:
    """Voice emotion metrics for a single interview recording.

    Attributes:
        dominant_emotion: Most frequent predicted emotion label.
        emotion_distribution: Share of each emotion label across analyzed chunks.
        stability_score: 0–1 stability (higher = fewer emotion flips).
        nervous_rate: Fraction of chunks tagged as sad/angry/fearful.
        emotion_score: Interview-oriented voice emotion score 0–100.
        chunks_analyzed: Number of speech chunks scored by the model.
    """

    dominant_emotion: str
    emotion_distribution: dict[str, float]
    stability_score: float
    nervous_rate: float
    emotion_score: int
    chunks_analyzed: int


@cache
def get_emotion_pipeline() -> Pipeline:
    """Create and cache the Hugging Face audio emotion classification pipeline."""

    log.info("SER: loading pipeline  model_id=%r", EMOTION_MODEL_ID)
    device = 0 if torch.cuda.is_available() else -1
    pipe = pipeline(
        task="audio-classification",
        model=EMOTION_MODEL_ID,
        device=device,
    )
    log.info("SER: pipeline ready  device=%s", "cuda" if device == 0 else "cpu")
    return pipe


def analyze_voice_emotion(audio_path: Path) -> EmotionAnalysisResult:
    """Run SER on speech segments of a mono WAV interview recording.

    Args:
        audio_path: Path to normalized 16 kHz mono WAV audio.

    Returns:
        Aggregated emotion metrics and interview-oriented emotion score.
    """

    chunks = _extract_speech_chunks(audio_path)
    if not chunks:
        log.warning("SER: no speech chunks found  path=%s", audio_path.name)
        return _default_result()

    try:
        classifier = get_emotion_pipeline()
        labels = [_classify_chunk(classifier, chunk) for chunk in chunks]
        log.info("SER: classified %d chunks  dominant=%s", len(labels), max(set(labels), key=labels.count))
    except Exception as exc:
        log.warning("SER: classifier failed, using prosody fallback — %s: %s", type(exc).__name__, exc)
        labels = [_prosody_fallback_label(chunk) for chunk in chunks]

    return _aggregate_labels(labels)


def blend_delivery_score(
    fluency_score: int,
    emotion_score: int,
    emotion_weight: float = EMOTION_DELIVERY_BLEND_WEIGHT,
) -> int:
    """Blend fluency (WPM/fillers) and voice emotion into one delivery dimension score.

    Args:
        fluency_score: Rule-based fluency score 0–100.
        emotion_score: Voice emotion score 0–100.
        emotion_weight: Weight given to emotion (default 25%).

    Returns:
        Combined delivery score clamped to ``[0, 100]``.
    """

    fluency_weight = 1.0 - emotion_weight
    raw = fluency_weight * fluency_score + emotion_weight * emotion_score
    return int(max(0, min(100, round(raw))))


def _extract_speech_chunks(audio_path: Path) -> list[np.ndarray]:
    """Split non-silent regions into chunks suitable for the SER model."""

    try:
        waveform, _ = librosa.load(str(audio_path), sr=EMOTION_SAMPLE_RATE, mono=True)
    except Exception:
        return []

    if waveform.size == 0:
        return []

    intervals = librosa.effects.split(waveform, top_db=PAUSE_TOP_DB)
    chunk_samples = int(EMOTION_CHUNK_SEC * EMOTION_SAMPLE_RATE)
    min_samples = int(EMOTION_MIN_CHUNK_SEC * EMOTION_SAMPLE_RATE)

    chunks: list[np.ndarray] = []
    for start, end in intervals:
        segment = waveform[start:end]
        if segment.size < min_samples:
            continue

        if segment.size <= chunk_samples:
            chunks.append(segment.astype(np.float32))
            continue

        for offset in range(0, segment.size, chunk_samples):
            piece = segment[offset : offset + chunk_samples]
            if piece.size >= min_samples:
                chunks.append(piece.astype(np.float32))

    return chunks


def _classify_chunk(classifier: Pipeline, chunk: np.ndarray) -> str:
    """Classify a single waveform chunk and return a normalized label."""

    result = cast(
        list[dict[str, Any]],
        classifier(
            {"raw": chunk, "sampling_rate": EMOTION_SAMPLE_RATE},
            top_k=1,
        ),
    )
    if not result:
        return _DEFAULT_EMOTION

    label = result[0].get("label", _DEFAULT_EMOTION)
    if not isinstance(label, str):
        return _DEFAULT_EMOTION

    return _normalize_label(label)


def _prosody_fallback_label(chunk: np.ndarray) -> str:
    """Lightweight heuristic when the HF model is unavailable."""

    rms = float(np.sqrt(np.mean(np.square(chunk))))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(chunk)))

    if rms < 0.01:
        return _DEFAULT_EMOTION
    if zcr > 0.12 and rms < 0.04:
        return "sad"
    if rms > 0.08 and zcr > 0.10:
        return "angry"
    return "neutral"


def _aggregate_labels(labels: list[str]) -> EmotionAnalysisResult:
    """Aggregate per-chunk labels into session-level metrics."""

    total = len(labels)
    counts: dict[str, int] = {}
    for label in labels:
        counts[label] = counts.get(label, 0) + 1

    distribution = {
        label: round(count / total, 3) for label, count in sorted(counts.items())
    }
    dominant = max(counts, key=counts.get)

    nervous_count = sum(1 for label in labels if label in _NERVOUS_LABELS)
    nervous_rate = round(nervous_count / total, 3)

    valence_scores = [_emotion_valence(label) for label in labels]
    mean_valence = float(np.mean(valence_scores))
    emotion_score = int(max(0, min(100, round(mean_valence * 100))))

    if total > 1:
        flips = sum(1 for idx in range(1, total) if labels[idx] != labels[idx - 1])
        stability_score = round(1.0 - flips / (total - 1), 3)
        instability_penalty = (1.0 - stability_score) * 12.0
        emotion_score = int(max(0, min(100, round(emotion_score - instability_penalty))))
    else:
        stability_score = 1.0

    return EmotionAnalysisResult(
        dominant_emotion=dominant,
        emotion_distribution=distribution,
        stability_score=stability_score,
        nervous_rate=nervous_rate,
        emotion_score=emotion_score,
        chunks_analyzed=total,
    )


def _emotion_valence(label: str) -> float:
    """Map a label to interview-friendly valence in ``[0, 1]``."""

    return _EMOTION_VALENCE.get(label, 0.65)


def _normalize_label(label: str) -> str:
    """Normalize HF label strings (e.g. ``LABEL_0`` or ``ang``) to lowercase keys."""

    cleaned = label.lower().strip()
    if cleaned.startswith("label_"):
        return _DEFAULT_EMOTION
    return cleaned.split("_")[-1] if cleaned else _DEFAULT_EMOTION


def _default_result() -> EmotionAnalysisResult:
    """Return unavailable metrics when no speech is detected."""

    return EmotionAnalysisResult(
        dominant_emotion=_DEFAULT_EMOTION,
        emotion_distribution={_DEFAULT_EMOTION: 1.0},
        stability_score=1.0,
        nervous_rate=0.0,
        emotion_score=0,
        chunks_analyzed=0,
    )
