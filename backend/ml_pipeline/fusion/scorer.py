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
from ml_pipeline.text.scoring import ContentScoreResult
from ml_pipeline.video.emotion import VideoEmotionResult


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
    *,
    include_non_verbal: bool = True,
) -> int:
    """Compute weighted final score (40% content, 30% delivery, 30% non-verbal).

    Args:
        content_score: Text/content score 0–100.
        delivery_score: Audio delivery score 0–100.
        non_verbal_score: Non-verbal score 0–100.
        include_non_verbal: Whether the non-verbal score came from analyzed
            video frames and should contribute to the final score.

    Returns:
        Rounded final score clamped to ``[0, 100]``.
    """

    if not include_non_verbal:
        available_weight = WEIGHT_CONTENT + WEIGHT_DELIVERY
        raw = (
            WEIGHT_CONTENT * content_score
            + WEIGHT_DELIVERY * delivery_score
        ) / available_weight
        return int(max(0, min(100, round(raw))))

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
    video_emotion: VideoEmotionResult | None = None,
    content_details: ContentScoreResult | None = None,
) -> dict[str, str]:
    """Generate rule-based actionable feedback from analysis metrics.

    Args:
        content_score: Text/content dimension score.
        delivery: Delivery analysis metrics and score.
        non_verbal_score: Non-verbal dimension score.
        transcription_preview: Short transcript snippet for content feedback.
        emotion: Optional voice emotion metrics for delivery feedback.
        video_emotion: Optional facial emotion metrics for non-verbal feedback.
        content_details: Optional content breakdown for richer feedback.

    Returns:
        Feedback dictionary with ``content``, ``delivery``, and ``non_verbal`` keys.
    """

    preview = transcription_preview[:120] + ("…" if len(transcription_preview) > 120 else "")

    if content_details is not None:
        if content_details.semantic_score < 55:
            relevance_hint = "Try to answer the specific question more directly."
        elif content_details.rubric_score < 55:
            relevance_hint = "Cover more key points from the question (examples, steps, outcomes)."
        elif content_details.completeness_score < 55:
            if content_details.behavioral_question:
                relevance_hint = (
                    "Expand using STAR: Situation, Task, Action, and Result with concrete detail."
                )
            else:
                relevance_hint = "Give a fuller explanation with examples and clearer structure."
        else:
            relevance_hint = "Good relevance and depth for this question."

        content_msg = (
            f"{relevance_hint} "
            f"(relevance {content_details.semantic_score}/100, "
            f"rubric {content_details.rubric_score}/100, "
            f"depth {content_details.completeness_score}/100). "
            f'Preview: "{preview}"'
        )
    elif content_score >= 80:
        content_msg = (
            f"Strong alignment with the interview question. "
            f'Preview: "{preview}"'
        )
    elif content_score >= 60:
        content_msg = (
            "Answer is somewhat on-topic — add more concrete examples "
            "that directly address the interview question."
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

    if video_emotion is not None and video_emotion.frames_analyzed > 0:
        stability_pct = int(video_emotion.stability_score * 100)
        if video_emotion.nervous_rate >= 0.4:
            non_verbal_msg = (
                f"Facial expression looks tense ({video_emotion.dominant_emotion}, "
                f"{int(video_emotion.nervous_rate * 100)}% nervous frames). "
                f"Aim for a steadier, more neutral expression."
            )
        elif non_verbal_score >= 80:
            non_verbal_msg = (
                f"Confident facial expression ({video_emotion.dominant_emotion}, "
                f"{stability_pct}% stability)."
            )
        else:
            non_verbal_msg = (
                f"Facial emotion score {non_verbal_score}/100 "
                f"({video_emotion.dominant_emotion}, {stability_pct}% stability)."
            )
    else:
        non_verbal_msg = (
            "No face detected consistently in the video — make sure your face is "
            "visible and well-lit throughout the recording."
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
    video_emotion: VideoEmotionResult | None = None,
    blended_delivery_score: int | None = None,
    content_details: ContentScoreResult | None = None,
) -> FusionResult:
    """Fuse dimension scores and build feedback in one step.

    Args:
        content_score: Text/content score 0–100.
        delivery: Delivery analysis result including delivery score.
        non_verbal_score: Non-verbal score 0–100.
        transcription: Full transcript text for feedback preview.
        emotion: Optional voice emotion metrics for feedback.
        video_emotion: Optional facial emotion metrics for non-verbal feedback.
        blended_delivery_score: Delivery score after blending fluency + emotion.
        content_details: Optional content breakdown for feedback messaging.

    Returns:
        ``FusionResult`` with final score and feedback.
    """

    delivery_score = (
        blended_delivery_score
        if blended_delivery_score is not None
        else delivery.delivery_score
    )
    include_non_verbal = video_emotion is None or video_emotion.frames_analyzed > 0
    final = fuse(
        content_score,
        delivery_score,
        non_verbal_score,
        include_non_verbal=include_non_verbal,
    )
    feedback = build_feedback(
        content_score,
        delivery,
        non_verbal_score,
        transcription,
        emotion=emotion,
        video_emotion=video_emotion,
        content_details=content_details,
    )

    return FusionResult(
        final_score=final,
        content_score=content_score,
        delivery_score=delivery_score,
        non_verbal_score=non_verbal_score,
        feedback=feedback,
    )
