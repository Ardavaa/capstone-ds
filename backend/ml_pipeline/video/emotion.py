"""Facial emotion analysis for interview video (YOLOv8-cls + YOLOv8n face detection)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import cache
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

from core.config import (
    VIDEO_EMOTION_MODEL_PATH,
    VIDEO_FACE_DETECTION_CONFIDENCE,
    VIDEO_FACE_DETECTOR_MODEL_PATH,
    VIDEO_FRAME_SAMPLE_FPS,
)

log = logging.getLogger(__name__)

# Interview-friendly valence per emotion label (0–1)
_EMOTION_VALENCE: dict[str, float] = {
    "neutral": 1.0,
    "happy": 0.95,
    "surprise": 0.75,
    "sad": 0.35,
    "fear": 0.30,
    "angry": 0.25,
    "disgust": 0.20,
}

_NERVOUS_LABELS: frozenset[str] = frozenset({"sad", "angry", "fear", "disgust"})

_DEFAULT_EMOTION = "neutral"


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class VideoEmotionResult:
    dominant_emotion: str
    emotion_distribution: dict[str, float]
    stability_score: float
    nervous_rate: float
    non_verbal_score: int
    frames_analyzed: int
    frames_sampled: int


@dataclass(frozen=True)
class FrameDetectionResult:
    """Single-frame facial emotion detection for the live camera overlay."""

    emotion: str
    confidence: float
    bbox_x: float | None
    bbox_y: float | None
    bbox_w: float | None
    bbox_h: float | None


# ─── Model loaders (cached) ───────────────────────────────────────────────────

@cache
def get_emotion_model() -> YOLO:
    """Load and cache the YOLOv8 classification model for facial emotion."""

    log.info("YOLOv8-cls: loading emotion model  path=%s", VIDEO_EMOTION_MODEL_PATH)
    model = YOLO(str(VIDEO_EMOTION_MODEL_PATH))
    log.info(
        "YOLOv8-cls: ready  classes=%s",
        list(model.names.values()) if hasattr(model, "names") else "unknown",
    )
    return model


@cache
def get_face_detector() -> YOLO:
    """Load and cache the YOLOv8n face detection model.

    Replaces the legacy Haar cascade with a neural face detector that produces
    stable, accurate bounding boxes regardless of lighting or head pose.

    Returns:
        A cached YOLO detection model (task=detect, class=FACE).

    Raises:
        FileNotFoundError: If the model file is missing.
    """

    log.info("YOLOv8n-face: loading face detector  path=%s", VIDEO_FACE_DETECTOR_MODEL_PATH)
    if not VIDEO_FACE_DETECTOR_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"YOLOv8n face detection model not found at {VIDEO_FACE_DETECTOR_MODEL_PATH}. "
            "Run the download script or copy yolov8n-face.pt into ml_pipeline/video/models/."
        )
    model = YOLO(str(VIDEO_FACE_DETECTOR_MODEL_PATH))
    log.info("YOLOv8n-face: ready  task=%s", model.task)
    return model


# ─── Public API ───────────────────────────────────────────────────────────────

def detect_frame_emotion(image_bytes: bytes) -> FrameDetectionResult:
    """Detect face emotion and bounding box from a single JPEG/PNG frame.

    Pipeline:
        1. YOLOv8n-face detects the largest face → bounding box (stable)
        2. Face crop is passed to YOLOv8-cls → emotion label + confidence

    Args:
        image_bytes: Encoded image bytes (e.g. JPEG from browser canvas).

    Returns:
        Emotion label, confidence, and relative bounding box (0–1), or null bbox.
    """

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        return _null_result()

    try:
        face_model = get_face_detector()
        emotion_model = get_emotion_model()
        face_crop, bbox = _detect_largest_face_yolo(face_model, frame)
        if face_crop is None or bbox is None:
            return _null_result()

        label, confidence = _classify_emotion_with_confidence(emotion_model, face_crop)
        return FrameDetectionResult(
            emotion=label,
            confidence=confidence,
            bbox_x=bbox[0],
            bbox_y=bbox[1],
            bbox_w=bbox[2],
            bbox_h=bbox[3],
        )
    except Exception as exc:
        log.debug("detect_frame_emotion: error — %s: %s", type(exc).__name__, exc)
        return _null_result()


def analyze_video_emotion(video_path: Path) -> VideoEmotionResult:
    """Sample frames, detect faces with YOLO, classify emotions, aggregate metrics.

    Args:
        video_path: Path to the uploaded interview video.

    Returns:
        Aggregated facial emotion metrics and non-verbal score.
    """

    frames = _sample_frames(video_path, VIDEO_FRAME_SAMPLE_FPS)
    if not frames:
        log.warning("VideoEmotion: no frames sampled  path=%s", video_path.name)
        return _default_result(0)

    log.info("VideoEmotion: sampled %d frames from %s", len(frames), video_path.name)
    try:
        face_model = get_face_detector()
        emotion_model = get_emotion_model()
        labels: list[str] = []
        for frame in frames:
            face_crop, _ = _detect_largest_face_yolo(face_model, frame)
            if face_crop is None:
                continue
            label = _classify_emotion(emotion_model, face_crop)
            labels.append(label)
    except Exception as exc:
        log.error(
            "VideoEmotion: inference failed — %s: %s",
            type(exc).__name__,
            exc,
            exc_info=True,
        )
        return _default_result(len(frames))

    log.info(
        "VideoEmotion: analyzed %d/%d frames  dominant=%s",
        len(labels),
        len(frames),
        max(set(labels), key=labels.count) if labels else "none",
    )
    if not labels:
        return _default_result(len(frames))

    return _aggregate_labels(labels, frames_sampled=len(frames))


# ─── Face detection (YOLO) ────────────────────────────────────────────────────

def _detect_largest_face_yolo(
    face_model: YOLO,
    frame: np.ndarray,
) -> tuple[np.ndarray | None, tuple[float, float, float, float] | None]:
    """Run YOLOv8n-face on a frame and return the largest face crop + relative bbox.

    YOLO detection models return ``results[0].boxes`` with xyxy coordinates and
    per-box confidence scores.  We pick the detection with the highest confidence
    (typically the most prominent face in the frame) to avoid grabbing background
    faces or false positives.

    Args:
        face_model: Cached YOLOv8n face detection model.
        frame: BGR numpy array (H×W×3).

    Returns:
        ``(face_crop_bgr, (x_rel, y_rel, w_rel, h_rel))`` or ``(None, None)``
        if no face is detected above the confidence threshold.
    """

    h, w = frame.shape[:2]

    results = face_model.predict(
        frame,
        conf=VIDEO_FACE_DETECTION_CONFIDENCE,
        verbose=False,
        # Only detect faces (class 0); saves time if model has multiple classes
        classes=[0],
    )

    if not results or results[0].boxes is None or len(results[0].boxes) == 0:
        return None, None

    boxes = results[0].boxes

    # Pick the box with the highest confidence score
    confidences = boxes.conf.cpu().numpy()
    best_idx = int(np.argmax(confidences))
    x1, y1, x2, y2 = boxes.xyxy[best_idx].cpu().numpy().astype(int)

    # Clamp to frame bounds
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(w, x2)
    y2 = min(h, y2)

    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return None, None

    # Relative bbox (0–1) matching the API contract
    bbox = (x1 / w, y1 / h, (x2 - x1) / w, (y2 - y1) / h)
    return crop, bbox


# ─── Emotion classification (YOLO-cls) ───────────────────────────────────────

def _classify_emotion(model: YOLO, face_bgr: np.ndarray) -> str:
    """Run the YOLO classifier on a face crop and return a normalized label."""

    label, _ = _classify_emotion_with_confidence(model, face_bgr)
    return label


def _classify_emotion_with_confidence(
    model: YOLO,
    face_bgr: np.ndarray,
) -> tuple[str, float]:
    """Run YOLO-cls and return ``(label, confidence 0–1)``."""

    results = model.predict(face_bgr, verbose=False)
    if not results:
        return _DEFAULT_EMOTION, 0.0

    top = results[0]
    if top.probs is None:
        return _DEFAULT_EMOTION, 0.0

    label = str(top.names.get(int(top.probs.top1), _DEFAULT_EMOTION)).lower()
    try:
        confidence = float(top.probs.top1conf)
        if hasattr(confidence, "item"):
            confidence = confidence.item()
    except (AttributeError, TypeError, ValueError):
        data = getattr(top.probs, "data", None)
        if data is not None and len(data) > 0:
            confidence = float(data[int(top.probs.top1)])
        else:
            confidence = 0.0
    return label, round(confidence, 3)


# ─── Aggregation ─────────────────────────────────────────────────────────────

def _aggregate_labels(labels: list[str], frames_sampled: int) -> VideoEmotionResult:
    """Aggregate per-frame labels into session-level metrics and a non-verbal score."""

    total = len(labels)
    counts: dict[str, int] = {}
    for label in labels:
        counts[label] = counts.get(label, 0) + 1

    distribution = {
        label: round(count / total, 3) for label, count in sorted(counts.items())
    }
    dominant = max(counts, key=counts.get)

    nervous_count = sum(1 for label in labels if label in _NERVOUS_LABELS)
    nervous_rate = round(nervous_count / total, 3)

    valence_scores = [_EMOTION_VALENCE.get(label, 0.65) for label in labels]
    mean_valence = float(np.mean(valence_scores))
    score = int(max(0, min(100, round(mean_valence * 100))))

    if total > 1:
        flips = sum(1 for idx in range(1, total) if labels[idx] != labels[idx - 1])
        stability_score = round(1.0 - flips / (total - 1), 3)
        instability_penalty = (1.0 - stability_score) * 12.0
        score = int(max(0, min(100, round(score - instability_penalty))))
    else:
        stability_score = 1.0

    return VideoEmotionResult(
        dominant_emotion=dominant,
        emotion_distribution=distribution,
        stability_score=stability_score,
        nervous_rate=nervous_rate,
        non_verbal_score=score,
        frames_analyzed=total,
        frames_sampled=frames_sampled,
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _null_result() -> FrameDetectionResult:
    """Return a no-face result for the live overlay endpoint."""
    return FrameDetectionResult(
        emotion=_DEFAULT_EMOTION,
        confidence=0.0,
        bbox_x=None,
        bbox_y=None,
        bbox_w=None,
        bbox_h=None,
    )


def _sample_frames(video_path: Path, target_fps: float) -> list[np.ndarray]:
    """Read a video and uniformly sample frames at the target frame rate."""

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return []

    src_fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if src_fps <= 0 or total <= 0:
        cap.release()
        return []

    step = max(1, int(round(src_fps / target_fps)))
    frames: list[np.ndarray] = []
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step == 0:
            frames.append(frame)
        idx += 1

    cap.release()
    return frames


def _default_result(frames_sampled: int) -> VideoEmotionResult:
    """Return unavailable metrics when no face is detected or processing fails."""

    return VideoEmotionResult(
        dominant_emotion=_DEFAULT_EMOTION,
        emotion_distribution={_DEFAULT_EMOTION: 1.0},
        stability_score=1.0,
        nervous_rate=0.0,
        non_verbal_score=0,
        frames_analyzed=0,
        frames_sampled=frames_sampled,
    )
