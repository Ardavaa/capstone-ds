"""FastAPI routes for interview analysis."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from tempfile import TemporaryDirectory

from anyio import to_thread
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from ml_pipeline.audio.analysis import DeliveryAnalysisResult, analyze_delivery
from ml_pipeline.audio.extraction import extract_audio_to_wav
from ml_pipeline.fusion.scorer import FusionResult, run_fusion
from ml_pipeline.text.scoring import content_score
from ml_pipeline.text.transcription import transcribe_audio
from ml_pipeline.video.stub import non_verbal_score

router = APIRouter()


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
    feedback: dict[str, str]
    file_name: str
    file_size_bytes: int


@dataclass
class _ProcessResult:
    """Internal pipeline result from the worker thread."""

    transcription: str
    delivery: DeliveryAnalysisResult
    fusion: FusionResult


@router.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_interview(
    file: UploadFile = File(...),
    question_topic: str = Form(default=""),
) -> AnalyzeResponse:
    """Analyze uploaded interview media end-to-end.

    Pipeline: ffmpeg extraction → Whisper transcription → delivery metrics →
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
    content = content_score(transcription, question_topic)
    non_verbal = non_verbal_score()
    fusion = run_fusion(content, delivery, non_verbal, transcription)

    return _ProcessResult(
        transcription=transcription,
        delivery=delivery,
        fusion=fusion,
    )
