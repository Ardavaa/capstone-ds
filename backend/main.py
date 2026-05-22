"""FastAPI entrypoint for the interview analysis backend."""

from pathlib import Path
from tempfile import TemporaryDirectory

from anyio import to_thread
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ml_pipeline.audio.extraction import extract_audio_to_wav
from ml_pipeline.text.transcription import transcribe_audio


class AnalyzeResponse(BaseModel):
    """Response payload returned by the interview analysis endpoint.

    Attributes:
        final_score: Mock interview score from 0 to 100.
        feedback: Actionable feedback grouped by interview dimension.
        file_name: Original uploaded file name.
        file_size_bytes: Size of the uploaded file in bytes.
        transcription: Speech-to-text output from the uploaded media.
    """

    final_score: int = Field(ge=0, le=100)
    feedback: dict[str, str]
    file_name: str
    file_size_bytes: int
    transcription: str


app = FastAPI(
    title="AI Interview Simulator API",
    description="Backend API for multimodal interview performance analysis.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Return a lightweight health check response.

    Returns:
        A status payload confirming the API is reachable.
    """

    return {"status": "ok"}


@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze_interview(file: UploadFile = File(...)) -> AnalyzeResponse:
    """Accept an interview media file and return a transcription-backed result.

    The endpoint saves the uploaded file to a temporary directory, extracts a
    normalized WAV track with `ffmpeg`, transcribes it with the Hugging Face
    `cahya/whisper-medium-id` model, and returns the transcript with a mock
    score/feedback payload.

    Args:
        file: Uploaded `.mp4` or `.wav` interview media file.

    Returns:
        An analysis response with transcript, score, feedback, and file metadata.

    Raises:
        HTTPException: If the uploaded file is empty or cannot be processed.
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
            print(
                "Received upload:",
                {
                    "file_name": file.filename,
                    "content_type": file.content_type,
                    "size_bytes": file_size_bytes,
                    "temporary_path": str(upload_path),
                },
            )

            transcription = await to_thread.run_sync(
                _extract_and_transcribe,
                upload_path,
                audio_path,
            )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return AnalyzeResponse(
        final_score=85,
        feedback={
            "content": "Transcription is ready for the upcoming content-quality module.",
            "delivery": "Audio was extracted successfully for future fluency analysis.",
            "non_verbal": "Video analysis is not enabled yet in this MVP step.",
        },
        file_name=file.filename or "uploaded-media",
        file_size_bytes=file_size_bytes,
        transcription=transcription,
    )


def _extract_and_transcribe(upload_path: Path, audio_path: Path) -> str:
    """Run blocking audio extraction and transcription work.

    Args:
        upload_path: Temporary path containing the uploaded media.
        audio_path: Temporary destination path for normalized WAV audio.

    Returns:
        The Whisper transcription text.
    """

    extracted_audio_path = extract_audio_to_wav(upload_path, audio_path)
    return transcribe_audio(extracted_audio_path)
