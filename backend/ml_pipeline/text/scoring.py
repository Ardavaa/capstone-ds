"""Content-quality scoring via sentence-transformer semantic similarity."""

from __future__ import annotations

from functools import cache

import numpy as np
from sentence_transformers import SentenceTransformer

from core.config import DEFAULT_QUESTION_TOPIC, SBERT_MODEL_ID


@cache
def get_sbert_model() -> SentenceTransformer:
    """Load and cache the multilingual sentence-transformer model.

    Returns:
        A cached ``SentenceTransformer`` instance.
    """

    return SentenceTransformer(SBERT_MODEL_ID)


def content_score(transcription: str, question_topic: str | None = None) -> int:
    """Score how semantically aligned the answer is with the interview topic.

    Cosine similarity between transcript and topic embeddings is mapped to
    a 0–100 scale. Empty transcripts return ``0``.

    Args:
        transcription: Whisper ASR output text.
        question_topic: Expected topic or interview question context. Uses a
            default technical-interview topic when empty.

    Returns:
        Content score from 0 to 100.
    """

    text = transcription.strip()
    if not text:
        return 0

    topic = (question_topic or "").strip() or DEFAULT_QUESTION_TOPIC

    model = get_sbert_model()
    embeddings = model.encode([text, topic], normalize_embeddings=True)
    similarity = float(np.dot(embeddings[0], embeddings[1]))

    # Map typical cosine range (~0.2–0.85) onto 0–100
    scaled = int(np.clip((similarity - 0.15) / 0.70 * 100, 0, 100))
    return scaled
