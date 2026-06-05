"""Content-quality scoring via E5 semantic relevance, rubric, and completeness."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import cache

import numpy as np
from sentence_transformers import CrossEncoder, SentenceTransformer

from core.config import (  # noqa: E402 – config sets HF_HOME
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

# Backward-compatible alias used by preflight routes.
SBERT_MODEL_ID = EMBEDDING_MODEL_ID


@dataclass(frozen=True)
class ContentScoreResult:
    """Breakdown of the composite content dimension score.

    Attributes:
        total: Final content score from 0 to 100.
        semantic_score: Question–answer relevance (E5 + optional cross-encoder).
        rubric_score: Coverage of rubric checkpoints derived from the question.
        completeness_score: Depth/structure (and STAR for behavioral prompts).
        cosine_similarity: Raw E5 cosine between query and passage embeddings.
        cross_encoder_score: Cross-encoder relevance mapped to 0–100, if available.
        question_used: Question text used as the semantic reference.
        behavioral_question: Whether STAR-style heuristics were applied.
    """

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
    """Load and cache the multilingual E5 embedding model."""

    log.info("Content embed: loading model  model_id=%r", EMBEDDING_MODEL_ID)
    model = SentenceTransformer(EMBEDDING_MODEL_ID)
    log.info("Content embed: model ready")
    return model


@cache
def get_sbert_model() -> SentenceTransformer:
    """Backward-compatible alias for preflight and legacy imports."""

    return get_embedding_model()


@cache
def get_cross_encoder() -> CrossEncoder:
    """Load and cache the multilingual cross-encoder for Q–A relevance."""

    log.info("Content cross-encoder: loading  model_id=%r", CROSS_ENCODER_MODEL_ID)
    model = CrossEncoder(CROSS_ENCODER_MODEL_ID)
    log.info("Content cross-encoder: ready")
    return model


def _e5_query(text: str) -> str:
    return f"query: {text.strip()}"


def _e5_passage(text: str) -> str:
    return f"passage: {text.strip()}"


def _cosine_to_score(similarity: float) -> int:
    """Map E5 cosine similarity onto a 0–100 scale."""

    return int(np.clip((similarity - 0.15) / 0.70 * 100, 0, 100))


def _logit_to_score(logit: float) -> int:
    """Map a cross-encoder logit to a 0–100 probability scale."""

    probability = 1.0 / (1.0 + np.exp(-float(logit)))
    return int(np.clip(probability * 100, 0, 100))


def _semantic_relevance_score(question: str, answer: str) -> tuple[int, float, int | None]:
    """Compute blended semantic relevance between question and answer."""

    model = get_embedding_model()
    embeddings = model.encode(
        [_e5_query(question), _e5_passage(answer)],
        normalize_embeddings=True,
    )
    cosine = float(np.dot(embeddings[0], embeddings[1]))
    e5_score = _cosine_to_score(cosine)

    cross_score: int | None = None
    if CONTENT_CROSS_ENCODER_BLEND > 0:
        try:
            raw = float(get_cross_encoder().predict([(question, answer)])[0])
            cross_score = _logit_to_score(raw)
            semantic = int(
                round(
                    CONTENT_SEMANTIC_CROSS_BLEND * e5_score
                    + CONTENT_CROSS_ENCODER_BLEND * cross_score,
                ),
            )
        except Exception as exc:
            log.warning(
                "Content cross-encoder failed, using E5 only — %s: %s",
                type(exc).__name__,
                exc,
            )
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
    """Score interview content using question–answer relevance and heuristics.

    Composite formula (configurable weights):

        total = semantic * w_sem + rubric * w_rub + completeness * w_comp

    Args:
        transcription: Whisper ASR output text.
        question_text: The interview question the candidate answered.
        question_topic: Broader role/topic context for rubric enrichment.

    Returns:
        Composite content score and per-component breakdown.
    """

    text = transcription.strip()
    if not text:
        log.warning("Content: empty transcription, returning score=0")
        return ContentScoreResult(
            total=0,
            semantic_score=0,
            rubric_score=0,
            completeness_score=0,
            cosine_similarity=0.0,
            cross_encoder_score=None,
            question_used="",
            behavioral_question=False,
        )

    topic = (question_topic or "").strip() or DEFAULT_QUESTION_TOPIC
    question = (question_text or "").strip() or topic
    if not (question_text or "").strip():
        log.warning(
            "Content: question_text missing; falling back to question_topic for semantic match",
        )

    behavioral = is_behavioral_question(question)
    rubric_points = derive_rubric_points(question, topic)

    semantic, cosine, cross_score = _semantic_relevance_score(question, text)
    rubric = rubric_coverage_score(text, rubric_points)
    completeness = completeness_score(text, behavioral=behavioral)

    total = int(
        round(
            CONTENT_WEIGHT_SEMANTIC * semantic
            + CONTENT_WEIGHT_RUBRIC * rubric
            + CONTENT_WEIGHT_COMPLETENESS * completeness,
        ),
    )
    total = int(np.clip(total, 0, 100))

    log.info(
        "Content: total=%d  semantic=%d  rubric=%d  completeness=%d  "
        "cosine=%.4f  cross=%s  behavioral=%s",
        total,
        semantic,
        rubric,
        completeness,
        cosine,
        cross_score,
        behavioral,
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
    """Return only the composite content score (legacy call sites).

    Args:
        transcription: Whisper ASR output text.
        question_text: Interview question used for relevance scoring.
        question_topic: Role/topic context for rubric enrichment.

    Returns:
        Content score from 0 to 100.
    """

    return analyze_content(
        transcription,
        question_text=question_text,
        question_topic=question_topic,
    ).total
