"""Delivery metrics derived from transcription text and extracted audio."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np

from core.config import (
    FILLER_WORDS,
    IDEAL_WPM,
    PAUSE_TOP_DB,
    WPM_TOLERANCE,
)


@dataclass(frozen=True)
class DeliveryAnalysisResult:
    """Container for delivery metrics and computed delivery score.

    Attributes:
        wpm: Words spoken per minute.
        filler_count: Number of detected filler tokens.
        filler_rate: Filler tokens as a percentage of total words.
        avg_pause_sec: Mean silence gap between speech segments.
        longest_silence_sec: Longest silence gap between speech segments.
        duration_sec: Total audio duration in seconds.
        delivery_score: Rule-based delivery score from 0 to 100.
    """

    wpm: float
    filler_count: int
    filler_rate: float
    avg_pause_sec: float
    longest_silence_sec: float
    duration_sec: float
    delivery_score: int


def get_audio_duration_sec(audio_path: Path, sample_rate: int = 16000) -> float:
    """Return the duration of a mono WAV file in seconds.

    Args:
        audio_path: Path to a WAV file.
        sample_rate: Expected sample rate for duration estimation.

    Returns:
        Duration in seconds, or ``0.0`` if the file cannot be read.
    """

    try:
        duration = float(librosa.get_duration(path=str(audio_path), sr=sample_rate))
    except Exception:
        return 0.0

    return max(duration, 0.0)


def compute_wpm(text: str, duration_sec: float) -> float:
    """Compute words per minute from transcript text and audio duration.

    Args:
        text: Transcribed speech text.
        duration_sec: Total audio duration in seconds.

    Returns:
        Words per minute, or ``0.0`` if duration is zero.
    """

    words = _tokenize_words(text)
    if duration_sec <= 0 or not words:
        return 0.0

    minutes = duration_sec / 60.0
    return round(len(words) / minutes, 1)


def detect_filler_words(text: str, filler_list: tuple[str, ...] = FILLER_WORDS) -> tuple[int, float]:
    """Count filler tokens and compute filler rate as a percentage of words.

    Args:
        text: Transcribed speech text.
        filler_list: Filler phrases to detect (longest match first).

    Returns:
        A tuple of ``(filler_count, filler_rate_percent)``.
    """

    words = _tokenize_words(text)
    total_words = len(words)
    if total_words == 0:
        return 0, 0.0

    lowered = text.lower()
    count = 0
    sorted_fillers = sorted(filler_list, key=len, reverse=True)

    for filler in sorted_fillers:
        pattern = re.compile(rf"\b{re.escape(filler)}\b", re.IGNORECASE)
        matches = pattern.findall(lowered)
        count += len(matches)
        lowered = pattern.sub(" ", lowered)

    rate = round((count / total_words) * 100.0, 2)
    return count, rate


def compute_pauses(audio_path: Path, sample_rate: int = 16000) -> tuple[float, float]:
    """Estimate average and longest silence gaps between speech segments.

    Uses ``librosa.effects.split`` to find non-silent intervals, then measures
    gaps between consecutive speech regions.

    Args:
        audio_path: Path to a mono WAV file.
        sample_rate: Sample rate used when loading audio.

    Returns:
        ``(avg_pause_sec, longest_silence_sec)``. Returns ``(0.0, 0.0)`` on failure.
    """

    try:
        waveform, _ = librosa.load(str(audio_path), sr=sample_rate, mono=True)
    except Exception:
        return 0.0, 0.0

    intervals = librosa.effects.split(waveform, top_db=PAUSE_TOP_DB)
    if len(intervals) < 2:
        return 0.0, 0.0

    pauses: list[float] = []
    for idx in range(len(intervals) - 1):
        gap_samples = intervals[idx + 1][0] - intervals[idx][1]
        if gap_samples > 0:
            pauses.append(gap_samples / sample_rate)

    if not pauses:
        return 0.0, 0.0

    return round(float(np.mean(pauses)), 2), round(float(np.max(pauses)), 2)


def delivery_score(wpm: float, filler_rate: float, avg_pause_sec: float) -> int:
    """Map delivery metrics to a 0–100 score using simple rule-based weighting.

    Args:
        wpm: Words per minute.
        filler_rate: Filler word rate as a percentage of total words.
        avg_pause_sec: Average pause length in seconds.

    Returns:
        Delivery score clamped to ``[0, 100]``.
    """

    wpm_delta = abs(wpm - IDEAL_WPM)
    wpm_component = max(0.0, 100.0 - (wpm_delta / WPM_TOLERANCE) * 100.0)

    filler_component = max(0.0, 100.0 - filler_rate * 12.0)

    if 0.25 <= avg_pause_sec <= 1.2:
        pause_component = 100.0
    else:
        pause_component = max(0.0, 100.0 - abs(avg_pause_sec - 0.7) * 35.0)

    raw = 0.45 * wpm_component + 0.35 * filler_component + 0.20 * pause_component
    return int(max(0, min(100, round(raw))))


def analyze_delivery(
    transcription: str,
    audio_path: Path,
) -> DeliveryAnalysisResult:
    """Run full delivery analysis on transcript text and extracted audio.

    Args:
        transcription: Whisper transcription output.
        audio_path: Path to normalized 16 kHz mono WAV audio.

    Returns:
        Delivery metrics plus computed delivery score.
    """

    duration_sec = get_audio_duration_sec(audio_path)
    wpm = compute_wpm(transcription, duration_sec)
    filler_count, filler_rate = detect_filler_words(transcription)
    avg_pause, longest_silence = compute_pauses(audio_path)
    score = delivery_score(wpm, filler_rate, avg_pause)

    return DeliveryAnalysisResult(
        wpm=wpm,
        filler_count=filler_count,
        filler_rate=filler_rate,
        avg_pause_sec=avg_pause,
        longest_silence_sec=longest_silence,
        duration_sec=round(duration_sec, 2),
        delivery_score=score,
    )


def _tokenize_words(text: str) -> list[str]:
    """Split text into word tokens for counting metrics."""

    return re.findall(r"\b[\w']+\b", text.lower())
