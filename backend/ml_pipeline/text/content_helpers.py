"""Heuristic rubric and completeness helpers for interview content scoring."""

from __future__ import annotations

import re
from typing import Final

_BEHAVIORAL_CUES: Final[tuple[str, ...]] = (
    "tell me about",
    "describe a time",
    "give me an example",
    "walk me through",
    "tell us about",
    "share an experience",
    "how did you handle",
    "what did you do when",
)

_STAR_DIMENSIONS: Final[dict[str, tuple[str, ...]]] = {
    "situation": ("situation", "when i", "during my", "at my", "in my", "while i", "back when"),
    "task": ("task", "responsible", "needed to", "goal was", "my role", "assigned"),
    "action": (
        "i implemented",
        "i built",
        "i created",
        "i decided",
        "i coordinated",
        "i worked",
        "we implemented",
        "i led",
        "i developed",
    ),
    "result": (
        "result",
        "outcome",
        "led to",
        "improved",
        "achieved",
        "increased",
        "decreased",
        "saved",
        "delivered",
        "successfully",
    ),
}

_STOPWORDS: Final[frozenset[str]] = frozenset(
    {
        "about",
        "after",
        "also",
        "been",
        "being",
        "could",
        "describe",
        "explain",
        "from",
        "have",
        "help",
        "how",
        "into",
        "more",
        "most",
        "some",
        "such",
        "tell",
        "than",
        "that",
        "their",
        "them",
        "then",
        "there",
        "these",
        "they",
        "this",
        "through",
        "what",
        "when",
        "where",
        "which",
        "while",
        "with",
        "would",
        "your",
        "interview",
        "question",
    },
)


def is_behavioral_question(question_text: str) -> bool:
    """Return whether the prompt looks like a behavioral STAR-style question."""

    lowered = question_text.lower()
    return any(cue in lowered for cue in _BEHAVIORAL_CUES)


def derive_rubric_points(question_text: str, question_topic: str) -> list[str]:
    """Build lightweight rubric checkpoints from the question and role topic.

    Args:
        question_text: The interview question shown to the candidate.
        question_topic: Broader role/topic context (fallback enrichment).

    Returns:
        A list of short rubric phrases to check in the answer.
    """

    points: list[str] = []

    if is_behavioral_question(question_text):
        points.extend(
            [
                "specific situation or context",
                "task or responsibility",
                "actions taken",
                "measurable result or outcome",
            ],
        )

    for source in (question_text, question_topic):
        for token in re.findall(r"[a-zA-Z]{4,}", source.lower()):
            if token in _STOPWORDS or token in points:
                continue
            points.append(token)
            if len(points) >= 10:
                return points

    return points


def rubric_coverage_score(answer: str, rubric_points: list[str]) -> int:
    """Score how many rubric checkpoints appear in the transcript.

    Args:
        answer: Candidate transcript text.
        rubric_points: Checkpoints from :func:`derive_rubric_points`.

    Returns:
        Rubric coverage score from 0 to 100.
    """

    if not rubric_points:
        return 50

    lowered = answer.lower()
    hits = 0
    for point in rubric_points:
        tokens = [token for token in point.split() if len(token) > 3]
        if not tokens:
            continue
        if " " in point:
            if all(token in lowered for token in tokens[: min(2, len(tokens))]):
                hits += 1
        elif tokens[0] in lowered:
            hits += 1

    return int(round(hits / len(rubric_points) * 100))


def star_structure_score(answer: str) -> int:
    """Estimate STAR structure coverage for behavioral answers.

    Args:
        answer: Candidate transcript text.

    Returns:
        STAR coverage score from 0 to 100.
    """

    lowered = answer.lower()
    dimensions = sum(
        1
        for keywords in _STAR_DIMENSIONS.values()
        if any(keyword in lowered for keyword in keywords)
    )
    return int(round(dimensions / len(_STAR_DIMENSIONS) * 100))


def completeness_score(answer: str, *, behavioral: bool) -> int:
    """Score answer depth using length, structure, and optional STAR cues.

    Args:
        answer: Candidate transcript text.
        behavioral: Whether STAR structure should influence the score.

    Returns:
        Completeness score from 0 to 100.
    """

    words = answer.split()
    word_count = len(words)
    sentence_count = len([part for part in re.split(r"[.!?]+", answer) if part.strip()])

    if word_count < 20:
        length_score = 25
    elif word_count < 50:
        length_score = 55
    elif word_count < 100:
        length_score = 75
    else:
        length_score = 90

    structure_score = int(min(100, 35 + sentence_count * 12))

    if behavioral:
        star_score = star_structure_score(answer)
        return int(0.5 * length_score + 0.2 * structure_score + 0.3 * star_score)

    return int(0.65 * length_score + 0.35 * structure_score)
