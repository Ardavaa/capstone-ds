"""
Analisis Kelancaran Suara (Audio Delivery Analysis)
Mendapatkan metrik penyampaian seperti WPM, filler words, dan jeda (silence).
"""

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
    wpm: float
    filler_count: int
    filler_rate: float
    avg_pause_sec: float
    longest_silence_sec: float
    duration_sec: float
    delivery_score: int
    filler_words_found: list[str]

def get_audio_duration_sec(audio_path: Path, sample_rate: int = 16000) -> float:
    """Mendapatkan durasi audio WAV (dalam detik)."""
    try:
        duration = float(librosa.get_duration(path=str(audio_path), sr=sample_rate))
        return max(duration, 0.0)
    except Exception:
        return 0.0

def compute_wpm(text: str, duration_sec: float) -> float:
    """Menghitung jumlah kata per menit (Words Per Minute)."""
    words = _tokenize_words(text)
    if duration_sec <= 0 or not words:
        return 0.0
    minutes = duration_sec / 60.0
    return round(len(words) / minutes, 1)

def detect_filler_words(
    text: str,
    filler_list: tuple[str, ...] = FILLER_WORDS,
) -> tuple[int, float, list[str]]:
    """Mendeteksi kata pengisi (filler words) seperti 'um', 'uh', dll."""
    words = _tokenize_words(text)
    total_words = len(words)
    if total_words == 0:
        return 0, 0.0, []

    lowered = text.lower()
    count = 0
    found: list[str] = []
    # Mengurutkan kata terpanjang terlebih dahulu untuk menghindari salah deteksi
    sorted_fillers = sorted(filler_list, key=len, reverse=True)

    for filler in sorted_fillers:
        pattern = re.compile(rf"\b{re.escape(filler)}\b", re.IGNORECASE)
        matches = pattern.findall(lowered)
        if matches:
            count += len(matches)
            found.extend([filler] * len(matches))
            # Hapus kata yang sudah dideteksi agar tidak terhitung dua kali
            lowered = pattern.sub(" ", lowered)

    rate = round((count / total_words) * 100.0, 2)
    return count, rate, found

def compute_pauses(audio_path: Path, sample_rate: int = 16000) -> tuple[float, float]:
    """Menghitung rata-rata jeda dan jeda terlama (keheningan) di antara ucapan."""
    try:
        waveform, _ = librosa.load(str(audio_path), sr=sample_rate, mono=True)
    except Exception:
        return 0.0, 0.0

    # Memisahkan bagian suara yang tidak sunyi (non-silent)
    intervals = librosa.effects.split(waveform, top_db=PAUSE_TOP_DB)
    if len(intervals) < 2:
        return 0.0, 0.0

    # Menghitung durasi keheningan di antara segmen suara
    pauses: list[float] = []
    for idx in range(len(intervals) - 1):
        gap_samples = intervals[idx + 1][0] - intervals[idx][1]
        if gap_samples > 0:
            pauses.append(gap_samples / sample_rate)

    if not pauses:
        return 0.0, 0.0

    return round(float(np.mean(pauses)), 2), round(float(np.max(pauses)), 2)

def delivery_score(wpm: float, filler_rate: float, avg_pause_sec: float) -> int:
    """Menghitung skor kelancaran berbicara (0-100) berdasarkan WPM, filler, dan jeda."""
    # Skor WPM (mendekati ideal 140 WPM semakin baik)
    wpm_delta = abs(wpm - IDEAL_WPM)
    wpm_component = max(0.0, 100.0 - (wpm_delta / WPM_TOLERANCE) * 100.0)

    # Skor Filler (semakin sedikit filler rate, semakin baik)
    filler_component = max(0.0, 100.0 - filler_rate * 12.0)

    # Skor Jeda (jeda ideal antara 0.25 - 1.2 detik)
    if 0.25 <= avg_pause_sec <= 1.2:
        pause_component = 100.0
    else:
        pause_component = max(0.0, 100.0 - abs(avg_pause_sec - 0.7) * 35.0)

    # Pembobotan: WPM 45%, Filler 35%, Pause 20%
    raw = 0.45 * wpm_component + 0.35 * filler_component + 0.20 * pause_component
    return int(max(0, min(100, round(raw))))

def analyze_delivery(
    transcription: str,
    audio_path: Path,
) -> DeliveryAnalysisResult:
    """Fungsi utama untuk menganalisis seluruh parameter kelancaran suara."""
    duration_sec = get_audio_duration_sec(audio_path)
    wpm = compute_wpm(transcription, duration_sec)
    filler_count, filler_rate, filler_found = detect_filler_words(transcription)
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
        filler_words_found=filler_found,
    )

def _tokenize_words(text: str) -> list[str]:
    """Memecah teks menjadi daftar kata-kata kecil (lowercase)."""
    return re.findall(r"\b[\w']+\b", text.lower())
