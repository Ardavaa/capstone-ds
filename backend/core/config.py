"""Central configuration for models, scoring weights, and analysis thresholds."""

from pathlib import Path
from typing import Final

# ─── Model IDs ───────────────────────────────────────────────────────────────

WHISPER_MODEL_ID: Final[str] = "openai/whisper-medium"
SBERT_MODEL_ID: Final[str] = "paraphrase-multilingual-MiniLM-L12-v2"
EMOTION_MODEL_ID: Final[str] = "superb/wav2vec2-base-superb-er"

# ─── Transcription (Whisper) ─────────────────────────────────────────────────

# paksa transkripsi Bahasa Indonesia (bukan translate ke Inggris)
WHISPER_LANGUAGE: Final[str] = "indonesian"
WHISPER_TASK: Final[str] = "transcribe"
# chunking untuk audio >30 detik (long-form)
WHISPER_CHUNK_LENGTH_S: Final[int] = 30

# ─── Voice emotion (SER) ─────────────────────────────────────────────────────

EMOTION_SAMPLE_RATE: Final[int] = 16000
EMOTION_CHUNK_SEC: Final[float] = 3.0
EMOTION_MIN_CHUNK_SEC: Final[float] = 1.0
EMOTION_DELIVERY_BLEND_WEIGHT: Final[float] = 0.25

# ─── Fusion weights (must sum to 1.0) ────────────────────────────────────────

WEIGHT_CONTENT: Final[float] = 0.40
WEIGHT_DELIVERY: Final[float] = 0.30
WEIGHT_NON_VERBAL: Final[float] = 0.30

# ─── Delivery analysis ───────────────────────────────────────────────────────

FILLER_WORDS: Final[tuple[str, ...]] = (
    "um",
    "uh",
    "eh",
    "hmm",
    "hm",
    "kinda",
    "like",
    "you know",
    "basically",
    "actually",
    "literally",
    "jadi",
    "gitu",
    "kan",
    "ya",
    "nah",
    "anu",
)

IDEAL_WPM: Final[float] = 140.0
WPM_TOLERANCE: Final[float] = 60.0

# Pause detection (librosa.effects.split top_db)
PAUSE_TOP_DB: Final[int] = 30

# ─── Video emotion (facial expression) ──────────────────────────────────────

VIDEO_EMOTION_MODEL_PATH: Final[Path] = (
    Path(__file__).resolve().parent.parent
    / "ml_pipeline"
    / "video"
    / "models"
    / "best.pt"
)
VIDEO_FRAME_SAMPLE_FPS: Final[float] = 1.0
VIDEO_FACE_DETECTION_CONFIDENCE: Final[float] = 0.5

# ─── Default topic when client omits question_topic ───────────────────────────

DEFAULT_QUESTION_TOPIC: Final[str] = (
    "technical interview software engineering problem solving communication"
)
