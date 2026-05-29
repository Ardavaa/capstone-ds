"""Facial emotion analysis for interview video (YOLOv8-cls + MediaPipe face detection)."""

from __future__ import annotations

from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import Any

import cv2
import mediapipe as mp
import numpy as np
from ultralytics import YOLO

from core.config import (
    VIDEO_EMOTION_MODEL_PATH,
    VIDEO_FACE_DETECTION_CONFIDENCE,
    VIDEO_FRAME_SAMPLE_FPS,
)

# interview-friendly valence per emotion label (0-1)
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


@dataclass(frozen=True)
class VideoEmotionResult:
    dominant_emotion: str
    emotion_distribution: dict[str, float]
    stability_score: float
    nervous_rate: float
    non_verbal_score: int
    frames_analyzed: int
    frames_sampled: int


@cache
def get_emotion_model() -> YOLO:
    """Load and cache the YOLOv8 classification model for facial emotion."""

    return YOLO(str(VIDEO_EMOTION_MODEL_PATH))


@cache
def get_face_detector() -> Any:
    """Create and cache the MediaPipe face detector."""

    return mp.solutions.face_detection.FaceDetection(
        model_selection=0,
        min_detection_confidence=VIDEO_FACE_DETECTION_CONFIDENCE,
    )


def analyze_video_emotion(video_path: Path) -> VideoEmotionResult:
    """Sample frames, detect faces, classify emotions, and aggregate metrics.

    Args:
        video_path: Path to the uploaded interview video.

    Returns:
        Aggregated facial emotion metrics and non-verbal score.
    """

    frames = _sample_frames(video_path, VIDEO_FRAME_SAMPLE_FPS)
    if not frames:
        return _default_result(0)

    try:
        detector = get_face_detector()
        model = get_emotion_model()
        labels: list[str] = []
        for frame in frames:
            face = _detect_largest_face(detector, frame)
            if face is None:
                continue
            label = _classify_emotion(model, face)
            labels.append(label)
    except Exception:
        return _default_result(len(frames))

    if not labels:
        return _default_result(len(frames))

    return _aggregate_labels(labels, frames_sampled=len(frames))


def _sample_frames(video_path: Path, target_fps: float) -> list[np.ndarray]:
    """Read a video and sample frames at the target frame rate."""

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


def _detect_largest_face(detector: Any, frame: np.ndarray) -> np.ndarray | None:
    """Detect the largest face in a frame and return its BGR crop."""

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = detector.process(rgb)
    if not result.detections:
        return None

    h, w = frame.shape[:2]
    best = max(
        result.detections,
        key=lambda d: d.location_data.relative_bounding_box.width
        * d.location_data.relative_bounding_box.height,
    )
    bbox = best.location_data.relative_bounding_box
    x = int(max(0, bbox.xmin * w))
    y = int(max(0, bbox.ymin * h))
    x2 = min(w, x + int(max(1, bbox.width * w)))
    y2 = min(h, y + int(max(1, bbox.height * h)))
    crop = frame[y:y2, x:x2]
    if crop.size == 0:
        return None
    return crop


def _classify_emotion(model: YOLO, face_bgr: np.ndarray) -> str:
    """Run the YOLO classifier on a face crop and return a normalized label."""

    results = model.predict(face_bgr, verbose=False)
    if not results:
        return _DEFAULT_EMOTION

    top = results[0]
    if top.probs is None:
        return _DEFAULT_EMOTION

    label = top.names.get(int(top.probs.top1), _DEFAULT_EMOTION)
    return str(label).lower()


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


def _default_result(frames_sampled: int) -> VideoEmotionResult:
    """Return neutral metrics when no face is detected or processing fails."""

    return VideoEmotionResult(
        dominant_emotion=_DEFAULT_EMOTION,
        emotion_distribution={_DEFAULT_EMOTION: 1.0},
        stability_score=1.0,
        nervous_rate=0.0,
        non_verbal_score=70,
        frames_analyzed=0,
        frames_sampled=frames_sampled,
    )
