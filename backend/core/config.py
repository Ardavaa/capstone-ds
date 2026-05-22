"""Central configuration for models, scoring weights, and analysis thresholds."""

from typing import Final

# ─── Model IDs ───────────────────────────────────────────────────────────────

WHISPER_MODEL_ID: Final[str] = "cobrayyxx/whisper-small-indo-eng"
SBERT_MODEL_ID: Final[str] = "paraphrase-multilingual-MiniLM-L12-v2"

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

# ─── Non-verbal stub ─────────────────────────────────────────────────────────

NON_VERBAL_STUB_SCORE: Final[int] = 75

# ─── Default topic when client omits question_topic ───────────────────────────

DEFAULT_QUESTION_TOPIC: Final[str] = (
    "technical interview software engineering problem solving communication"
)
