"""
Penilaian Relevansi Teks (Text Semantic Relevance Scoring)
Mengukur seberapa relevan isi jawaban kandidat terhadap pertanyaan menggunakan model E5.
"""

from __future__ import annotations
import logging
from dataclasses import dataclass
from functools import cache

import numpy as np
from sentence_transformers import CrossEncoder, SentenceTransformer

from core.config import (
    CONTENT_CROSS_ENCODER_BLEND,
    CONTENT_SEMANTIC_CROSS_BLEND,
    CONTENT_WEIGHT_COMPLETENESS,
    CONTENT_WEIGHT_RUBRIC,
    CONTENT_WEIGHT_SEMANTIC,
    CROSS_ENCODER_MODEL_ID,
    DEFAULT_QUESTION_TOPIC,
    EMBEDDING_MODEL_ID,
)
from ml_pipeline.text.content_helpers import (
    completeness_score,
    derive_rubric_points,
    is_behavioral_question,
    rubric_coverage_score,
)

log = logging.getLogger(__name__)

# Alias untuk kompatibilitas ke belakang
SBERT_MODEL_ID = EMBEDDING_MODEL_ID

@dataclass(frozen=True)
class ContentScoreResult:
    total: int
    semantic_score: int
    rubric_score: int
    completeness_score: int
    cosine_similarity: float
    cross_encoder_score: int | None
    question_used: str
    behavioral_question: bool

@cache
def get_embedding_model() -> SentenceTransformer:
    """Memuat dan menyimpan cache model embedding multilingual E5."""
    log.info("Content embed: memuat model_id=%r", EMBEDDING_MODEL_ID)
    model = SentenceTransformer(EMBEDDING_MODEL_ID)
    log.info("Content embed: model siap")
    return model

@cache
def get_sbert_model() -> SentenceTransformer:
    """Alias kompatibilitas model embedding."""
    return get_embedding_model()

@cache
def get_cross_encoder() -> CrossEncoder:
    """Memuat dan menyimpan cache model Cross-Encoder untuk penilaian kecocokan tingkat tinggi."""
    log.info("Content cross-encoder: memuat model_id=%r", CROSS_ENCODER_MODEL_ID)
    model = CrossEncoder(CROSS_ENCODER_MODEL_ID)
    log.info("Content cross-encoder: siap")
    return model

def _e5_query(text: str) -> str:
    """Format query wajib untuk model E5."""
    return f"query: {text.strip()}"

def _e5_passage(text: str) -> str:
    """Format teks (passage) wajib untuk model E5."""
    return f"passage: {text.strip()}"

def _cosine_to_score(similarity: float) -> int:
    """Memetakan nilai kemiripan cosine (similarity) menjadi skor skala 0–100."""
    return int(np.clip((similarity - 0.15) / 0.70 * 100, 0, 100))

def _logit_to_score(logit: float) -> int:
    """Memetakan nilai keluaran (logit) Cross-Encoder menjadi skor skala 0-100."""
    probability = 1.0 / (1.0 + np.exp(-float(logit)))
    return int(np.clip(probability * 100, 0, 100))

def _semantic_relevance_score(question: str, answer: str) -> tuple[int, float, int | None]:
    """Menghitung nilai relevansi semantik antara pertanyaan dan jawaban kandidat."""
    model = get_embedding_model()
    # Mengkodekan teks ke bentuk vektor (embedding)
    embeddings = model.encode(
        [_e5_query(question), _e5_passage(answer)],
        normalize_embeddings=True,
    )
    # Kemiripan cosine antara vektor pertanyaan dan jawaban
    cosine = float(np.dot(embeddings[0], embeddings[1]))
    e5_score = _cosine_to_score(cosine)

    cross_score: int | None = None
    if CONTENT_CROSS_ENCODER_BLEND > 0:
        try:
            # Opsional: Memperbaiki akurasi menggunakan model Cross-Encoder
            raw = float(get_cross_encoder().predict([(question, answer)])[0])
            cross_score = _logit_to_score(raw)
            # Gabungkan skor E5 dan Cross-Encoder sesuai bobot konfigurasi
            semantic = int(
                round(
                    CONTENT_SEMANTIC_CROSS_BLEND * e5_score
                    + CONTENT_CROSS_ENCODER_BLEND * cross_score,
                ),
            )
        except Exception as exc:
            log.warning("Cross-encoder gagal, menggunakan skor E5 saja — %s", exc)
            semantic = e5_score
    else:
        semantic = e5_score

    return semantic, cosine, cross_score

def analyze_content(
    transcription: str,
    *,
    question_text: str | None = None,
    question_topic: str | None = None,
) -> ContentScoreResult:
    """Menghitung total skor konten teks berdasarkan relevansi semantik, rubrik, dan kelengkapan."""
    text = transcription.strip()
    if not text:
        log.warning("Content: transkripsi kosong, mengembalikan skor 0")
        return ContentScoreResult(
            total=0, semantic_score=0, rubric_score=0, completeness_score=0,
            cosine_similarity=0.0, cross_encoder_score=None, question_used="",
            behavioral_question=False,
        )

    # Tetapkan fallback pertanyaan dan topik jika kosong
    topic = (question_topic or "").strip() or DEFAULT_QUESTION_TOPIC
    question = (question_text or "").strip() or topic
    if not (question_text or "").strip():
        log.warning("Content: question_text kosong; menggunakan topik sebagai referensi")

    behavioral = is_behavioral_question(question)
    rubric_points = derive_rubric_points(question, topic)

    # Hitung 3 komponen nilai utama
    semantic, cosine, cross_score = _semantic_relevance_score(question, text)
    rubric = rubric_coverage_score(text, rubric_points)
    completeness = completeness_score(text, behavioral=behavioral)

    # Penggabungan nilai akhir berdasarkan bobot masing-masing komponen
    total = int(
        round(
            CONTENT_WEIGHT_SEMANTIC * semantic
            + CONTENT_WEIGHT_RUBRIC * rubric
            + CONTENT_WEIGHT_COMPLETENESS * completeness,
        ),
    )
    total = int(np.clip(total, 0, 100))

    log.info(
        "Content: total=%d semantic=%d rubric=%d completeness=%d cosine=%.4f",
        total, semantic, rubric, completeness, cosine
    )

    return ContentScoreResult(
        total=total,
        semantic_score=semantic,
        rubric_score=rubric,
        completeness_score=completeness,
        cosine_similarity=cosine,
        cross_encoder_score=cross_score,
        question_used=question,
        behavioral_question=behavioral,
    )

def content_score(
    transcription: str,
    question_text: str | None = None,
    question_topic: str | None = None,
) -> int:
    """Mengembalikan nilai total skor konten (kompatibilitas kode lama)."""
    return analyze_content(
        transcription,
        question_text=question_text,
        question_topic=question_topic,
    ).total
