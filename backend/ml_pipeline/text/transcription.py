"""
Transkripsi Suara ke Teks (Speech-to-Text)
Menggunakan model Whisper (faster-whisper) untuk mengubah rekaman suara menjadi teks.
"""

import logging
from functools import cache
from pathlib import Path
import torch
from faster_whisper import WhisperModel

from core.config import HF_CACHE_DIR, WHISPER_MODEL_ID

log = logging.getLogger(__name__)

@cache
def get_transcription_pipeline() -> WhisperModel:
    """Memuat dan menyimpan cache instance model WhisperModel."""
    log.info("Whisper: memuat model faster-whisper model_id=%r", WHISPER_MODEL_ID)
    
    # Deteksi penggunaan GPU CUDA untuk kecepatan ekstra
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"

    model = WhisperModel(
        WHISPER_MODEL_ID,
        device=device,
        compute_type=compute_type,
        download_root=str(HF_CACHE_DIR / "faster-whisper"),
    )
    log.info("Whisper: model siap pada device=%s (%s)", device, compute_type)
    return model

def transcribe_audio(audio_path: Path) -> str:
    """Mengubah berkas suara WAV menjadi teks transkripsi bahasa Inggris/Indonesia."""
    log.info("Whisper: memulai transkripsi berkas=%s", audio_path.name)
    model = get_transcription_pipeline()

    # Model mengembalikan generator segmen omongan
    segments, info = model.transcribe(
        str(audio_path),
        beam_size=5,
        temperature=0.0,
        repetition_penalty=1.2,
        no_repeat_ngram_size=3,
    )

    # Gabungkan semua potongan segmen teks menjadi satu paragraf penuh
    text_segments = [segment.text for segment in segments]
    full_text = "".join(text_segments)
    stripped = full_text.strip()

    log.info("Whisper: selesai transkripsi (%d karakter)", len(stripped))
    return stripped
