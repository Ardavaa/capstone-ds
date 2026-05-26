"""FastAPI routes for interview analysis."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory

from anyio import to_thread
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from core.config import EMOTION_DELIVERY_BLEND_WEIGHT
from ml_pipeline.audio.analysis import DeliveryAnalysisResult, analyze_delivery
from ml_pipeline.audio.emotion import EmotionAnalysisResult, analyze_voice_emotion, blend_delivery_score
from ml_pipeline.audio.extraction import extract_audio_to_wav
from ml_pipeline.fusion.scorer import FusionResult, run_fusion
from ml_pipeline.text.scoring import content_score
from ml_pipeline.text.transcription import transcribe_audio
from ml_pipeline.video.stub import non_verbal_score

router = APIRouter()


class EmotionMetrics(BaseModel):
    """Voice emotion metrics exposed in the analysis API response."""

    dominant_emotion: str
    emotion_distribution: dict[str, float]
    stability_score: float
    nervous_rate: float
    emotion_score: int = Field(ge=0, le=100)
    chunks_analyzed: int = Field(ge=0)


class DeliveryMetrics(BaseModel):
    """Delivery metrics exposed in the analysis API response.

    Attributes:
        wpm: Words per minute.
        filler_count: Number of detected filler tokens.
        filler_rate: Filler rate as a percentage of total words.
        avg_pause_sec: Average pause between speech segments.
        longest_silence_sec: Longest detected silence gap.
        duration_sec: Total audio duration in seconds.
    """

    wpm: float
    filler_count: int
    filler_rate: float
    avg_pause_sec: float
    longest_silence_sec: float
    duration_sec: float


class AnalyzeResponse(BaseModel):
    """Full multimodal analysis response.

    Attributes:
        final_score: Weighted total score 0–100.
        content_score: Text/content dimension score.
        delivery_score: Audio delivery dimension score.
        non_verbal_score: Non-verbal dimension score.
        transcription: Whisper speech-to-text output.
        delivery_metrics: Raw delivery metrics.
        emotion_metrics: Voice emotion (SER) metrics.
        feedback: Actionable feedback by dimension.
        file_name: Original uploaded filename.
        file_size_bytes: Uploaded file size in bytes.
    """

    final_score: int = Field(ge=0, le=100)
    content_score: int = Field(ge=0, le=100)
    delivery_score: int = Field(ge=0, le=100)
    non_verbal_score: int = Field(ge=0, le=100)
    transcription: str
    delivery_metrics: DeliveryMetrics
    emotion_metrics: EmotionMetrics
    feedback: dict[str, str]
    file_name: str
    file_size_bytes: int


@dataclass
class _ProcessResult:
    """Internal pipeline result from the worker thread."""

    transcription: str
    delivery: DeliveryAnalysisResult
    emotion: EmotionAnalysisResult
    fusion: FusionResult


@router.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_interview(
    file: UploadFile = File(...),
    question_topic: str = Form(default=""),
) -> AnalyzeResponse:
    """Analyze uploaded interview media end-to-end.

    Pipeline: ffmpeg extraction → Whisper transcription → delivery + voice emotion →
    S-BERT content score → non-verbal stub → weighted fusion.

    Args:
        file: Uploaded ``.mp4``, ``.wav``, or other media supported by ffmpeg.
        question_topic: Optional interview question or topic for content scoring.

    Returns:
        Structured analysis with scores, metrics, transcript, and feedback.

    Raises:
        HTTPException: On empty uploads or processing failures.
    """

    suffix = Path(file.filename or "").suffix.lower()

    try:
        contents = await file.read()
    except OSError as exc:
        raise HTTPException(
            status_code=400,
            detail="Unable to read the uploaded file.",
        ) from exc

    file_size_bytes = len(contents)
    if file_size_bytes == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        with TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            upload_path = temp_path / f"interview-upload{suffix or '.media'}"
            audio_path = temp_path / "interview-audio.wav"
            upload_path.write_bytes(contents)

            result = await to_thread.run_sync(
                _process_interview,
                upload_path,
                audio_path,
                question_topic,
            )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    delivery = result.delivery
    emotion = result.emotion
    fusion = result.fusion

    return AnalyzeResponse(
        final_score=fusion.final_score,
        content_score=fusion.content_score,
        delivery_score=fusion.delivery_score,
        non_verbal_score=fusion.non_verbal_score,
        transcription=result.transcription,
        delivery_metrics=DeliveryMetrics(
            wpm=delivery.wpm,
            filler_count=delivery.filler_count,
            filler_rate=delivery.filler_rate,
            avg_pause_sec=delivery.avg_pause_sec,
            longest_silence_sec=delivery.longest_silence_sec,
            duration_sec=delivery.duration_sec,
        ),
        emotion_metrics=EmotionMetrics(
            dominant_emotion=emotion.dominant_emotion,
            emotion_distribution=emotion.emotion_distribution,
            stability_score=emotion.stability_score,
            nervous_rate=emotion.nervous_rate,
            emotion_score=emotion.emotion_score,
            chunks_analyzed=emotion.chunks_analyzed,
        ),
        feedback=fusion.feedback,
        file_name=file.filename or "uploaded-media",
        file_size_bytes=file_size_bytes,
    )


def _process_interview(
    upload_path: Path,
    audio_path: Path,
    question_topic: str,
) -> _ProcessResult:
    """Run the full blocking analysis pipeline.

    Args:
        upload_path: Path to the uploaded media file.
        audio_path: Path for normalized WAV output.
        question_topic: Topic or question text for content scoring.

    Returns:
        Transcription, delivery metrics, and fusion result.
    """

    extracted = extract_audio_to_wav(upload_path, audio_path)
    transcription = transcribe_audio(extracted)
    delivery = analyze_delivery(transcription, extracted)
    emotion = analyze_voice_emotion(extracted)
    blended_delivery = blend_delivery_score(
        delivery.delivery_score,
        emotion.emotion_score,
        EMOTION_DELIVERY_BLEND_WEIGHT,
    )
    content = content_score(transcription, question_topic)
    non_verbal = non_verbal_score()
    fusion = run_fusion(
        content,
        delivery,
        non_verbal,
        transcription,
        emotion=emotion,
        blended_delivery_score=blended_delivery,
    )

    return _ProcessResult(
        transcription=transcription,
        delivery=delivery,
        emotion=emotion,
        fusion=fusion,
    )
