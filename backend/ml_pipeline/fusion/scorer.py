"""Weighted score fusion and rule-based actionable feedback."""

from __future__ import annotations

from dataclasses import dataclass

from core.config import (
    WEIGHT_CONTENT,
    WEIGHT_DELIVERY,
    WEIGHT_NON_VERBAL,
)
from ml_pipeline.audio.analysis import DeliveryAnalysisResult
from ml_pipeline.audio.emotion import EmotionAnalysisResult


@dataclass(frozen=True)
class FusionResult:
    """Final fused interview score and dimension breakdown.

    Attributes:
        final_score: Weighted total score from 0 to 100.
        content_score: Text/content dimension score.
        delivery_score: Audio delivery dimension score.
        non_verbal_score: Visual/non-verbal dimension score.
        feedback: Actionable feedback keyed by dimension.
    """

    final_score: int
    content_score: int
    delivery_score: int
    non_verbal_score: int
    feedback: dict[str, str]


def fuse(
    content_score: int,
    delivery_score: int,
    non_verbal_score: int,
) -> int:
    """Compute weighted final score (40% content, 30% delivery, 30% non-verbal).

    Args:
        content_score: Text/content score 0–100.
        delivery_score: Audio delivery score 0–100.
        non_verbal_score: Non-verbal score 0–100.

    Returns:
        Rounded final score clamped to ``[0, 100]``.
    """

    raw = (
        WEIGHT_CONTENT * content_score
        + WEIGHT_DELIVERY * delivery_score
        + WEIGHT_NON_VERBAL * non_verbal_score
    )
    return int(max(0, min(100, round(raw))))


def build_feedback(
    content_score: int,
    delivery: DeliveryAnalysisResult,
    non_verbal_score: int,
    transcription_preview: str,
    emotion: EmotionAnalysisResult | None = None,
) -> dict[str, str]:
    """Generate rule-based actionable feedback from analysis metrics.

    Args:
        content_score: Text/content dimension score.
        delivery: Delivery analysis metrics and score.
        non_verbal_score: Non-verbal dimension score.
        transcription_preview: Short transcript snippet for content feedback.
        emotion: Optional voice emotion metrics for delivery feedback.

    Returns:
        Feedback dictionary with ``content``, ``delivery``, and ``non_verbal`` keys.
    """

    preview = transcription_preview[:120] + ("…" if len(transcription_preview) > 120 else "")

    if content_score >= 80:
        content_msg = (
            f"Strong semantic alignment with the topic. "
            f'Preview: "{preview}"'
        )
    elif content_score >= 60:
        content_msg = (
            "Answer is somewhat on-topic — add more concrete examples "
            "that directly address the question."
        )
    else:
        content_msg = (
            "Content appears off-topic or too brief. Restructure answers "
            "to directly address the interview question."
        )

    if delivery.filler_rate > 4.0:
        delivery_msg = (
            f"Filler word rate is {delivery.filler_rate:.1f}% "
            f"({delivery.filler_count} detected). Replace fillers with brief pauses."
        )
    elif delivery.wpm > 170:
        delivery_msg = (
            f"Pacing is fast at {delivery.wpm} WPM — slow down slightly for clarity."
        )
    elif delivery.wpm < 100 and delivery.wpm > 0:
        delivery_msg = (
            f"Pacing is slow at {delivery.wpm} WPM — aim closer to 130–150 WPM."
        )
    else:
        delivery_msg = (
            f"Solid delivery at {delivery.wpm} WPM with {delivery.filler_rate:.1f}% fillers. "
            f"Avg pause {delivery.avg_pause_sec}s."
        )

    if emotion is not None and emotion.chunks_analyzed > 0:
        stability_pct = int(emotion.stability_score * 100)
        if emotion.nervous_rate >= 0.4:
            delivery_msg += (
                f" Voice tone sounds tense ({emotion.dominant_emotion}, "
                f"{int(emotion.nervous_rate * 100)}% nervous segments)."
            )
        elif emotion.emotion_score >= 80:
            delivery_msg += (
                f" Voice tone is steady ({emotion.dominant_emotion}, "
                f"{stability_pct}% stability)."
            )
        else:
            delivery_msg += (
                f" Voice emotion score {emotion.emotion_score}/100 "
                f"({emotion.dominant_emotion})."
            )

    if non_verbal_score >= 80:
        non_verbal_msg = "Non-verbal signals look confident (stub score — video ML pending)."
    else:
        non_verbal_msg = (
            "Non-verbal analysis uses a placeholder score until video models are enabled. "
            "Maintain eye contact and steady posture when recording."
        )

    return {
        "content": content_msg,
        "delivery": delivery_msg,
        "non_verbal": non_verbal_msg,
    }


def run_fusion(
    content_score: int,
    delivery: DeliveryAnalysisResult,
    non_verbal_score: int,
    transcription: str,
    emotion: EmotionAnalysisResult | None = None,
    blended_delivery_score: int | None = None,
) -> FusionResult:
    """Fuse dimension scores and build feedback in one step.

    Args:
        content_score: Text/content score 0–100.
        delivery: Delivery analysis result including delivery score.
        non_verbal_score: Non-verbal score 0–100.
        transcription: Full transcript text for feedback preview.
        emotion: Optional voice emotion metrics for feedback.
        blended_delivery_score: Delivery score after blending fluency + emotion.

    Returns:
        ``FusionResult`` with final score and feedback.
    """

    delivery_score = (
        blended_delivery_score
        if blended_delivery_score is not None
        else delivery.delivery_score
    )
    final = fuse(content_score, delivery_score, non_verbal_score)
    feedback = build_feedback(
        content_score,
        delivery,
        non_verbal_score,
        transcription,
        emotion=emotion,
    )

    return FusionResult(
        final_score=final,
        content_score=content_score,
        delivery_score=delivery_score,
        non_verbal_score=non_verbal_score,
        feedback=feedback,
    )
