"""
Analisis Emosi Wajah (Facial Emotion Analysis)
Mendeteksi wajah kandidat menggunakan YOLOv8-face dan mengklasifikasikan emosi menggunakan YOLOv8-cls.
"""

from __future__ import annotations
import logging
import subprocess
import tempfile
from dataclasses import dataclass
from functools import cache
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

from core.config import (
    FFMPEG_TIMEOUT_SEC,
    VIDEO_EMOTION_MODEL_PATH,
    VIDEO_FACE_DETECTION_CONFIDENCE,
    VIDEO_FACE_DETECTOR_MODEL_PATH,
    VIDEO_FRAME_SAMPLE_FPS,
)

log = logging.getLogger(__name__)

# Nilai valence emosi wajah (0-1) yang bersahabat untuk wawancara kerja
_EMOTION_VALENCE: dict[str, float] = {
    "neutral": 1.0,
    "happy": 0.95,
    "surprise": 0.75,
    "sad": 0.35,
    "fear": 0.30,
    "angry": 0.25,
    "disgust": 0.20,
}

_NERVOUS_LABELS: frozenset[str] = frozenset({"sad", "fear", "angry", "disgust"})
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

@dataclass(frozen=True)
class FrameDetectionResult:
    emotion: str
    confidence: float
    bbox_x: float | None
    bbox_y: float | None
    bbox_w: float | None
    bbox_h: float | None

@cache
def get_emotion_model() -> YOLO:
    """Memuat dan menyimpan cache model YOLOv8 untuk klasifikasi ekspresi wajah."""
    log.info("YOLOv8-cls: memuat model dari %s", VIDEO_EMOTION_MODEL_PATH)
    return YOLO(str(VIDEO_EMOTION_MODEL_PATH))

@cache
def get_face_detector() -> YOLO:
    """Memuat dan menyimpan cache model YOLOv8n-face untuk deteksi wajah."""
    log.info("YOLOv8n-face: memuat model dari %s", VIDEO_FACE_DETECTOR_MODEL_PATH)
    if not VIDEO_FACE_DETECTOR_MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model deteksi wajah tidak ditemukan di {VIDEO_FACE_DETECTOR_MODEL_PATH}. "
            "Harap letakkan model yolov8n-face.pt ke folder ml_pipeline/video/models/."
        )
    return YOLO(str(VIDEO_FACE_DETECTOR_MODEL_PATH))

def detect_frame_emotion(image_bytes: bytes) -> FrameDetectionResult:
    """Mendeteksi emosi dan posisi wajah pada satu frame gambar (overlay kamera langsung)."""
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        return _null_result()

    try:
        face_model = get_face_detector()
        emotion_model = get_emotion_model()
        
        # Cari wajah terbesar di gambar
        face_crop, bbox = _detect_largest_face_yolo(face_model, frame)
        if face_crop is None or bbox is None:
            return _null_result()

        # Klasifikasikan emosi dari potongan gambar wajah tersebut
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
        log.debug("detect_frame_emotion error — %s", exc)
        return _null_result()

def analyze_video_emotion(video_path: Path) -> VideoEmotionResult:
    """Mengambil beberapa frame dari video, mendeteksi wajah, mengklasifikasi emosi, dan merangkum nilainya."""
    frames = _sample_frames(video_path, VIDEO_FRAME_SAMPLE_FPS)
    if not frames:
        log.warning("VideoEmotion: tidak ada frame yang disampling untuk %s", video_path.name)
        return _default_result(0)

    try:
        face_model = get_face_detector()
        emotion_model = get_emotion_model()
        labels: list[str] = []
        
        for frame in frames:
            face_crop, _ = _detect_largest_face_yolo(face_model, frame)
            if face_crop is not None:
                labels.append(_classify_emotion(emotion_model, face_crop))
                
    except Exception as exc:
        log.error("VideoEmotion: inferensi gagal — %s", exc, exc_info=True)
        return _default_result(len(frames))

    if not labels:
        return _default_result(len(frames))

    return _aggregate_labels(labels, frames_sampled=len(frames))

def _detect_largest_face_yolo(
    face_model: YOLO,
    frame: np.ndarray,
) -> tuple[np.ndarray | None, tuple[float, float, float, float] | None]:
    """Mendeteksi wajah dan mengembalikan potongan wajah terbesar beserta bounding box koordinat relatif (0-1)."""
    h, w = frame.shape[:2]
    results = face_model.predict(
        frame,
        conf=VIDEO_FACE_DETECTION_CONFIDENCE,
        verbose=False,
        classes=[0],  # Deteksi kelas wajah saja
    )

    if not results or results[0].boxes is None or len(results[0].boxes) == 0:
        return None, None

    # Ambil wajah dengan nilai kecocokan/confidence tertinggi
    boxes = results[0].boxes
    confidences = boxes.conf.cpu().numpy()
    best_idx = int(np.argmax(confidences))
    x1, y1, x2, y2 = boxes.xyxy[best_idx].cpu().numpy().astype(int)

    # Batasi koordinat agar tidak melebihi ukuran gambar
    x1, y1, x2, y2 = max(0, x1), max(0, y1), min(w, x2), min(h, y2)
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return None, None

    # Format bounding box relatif
    bbox = (x1 / w, y1 / h, (x2 - x1) / w, (y2 - y1) / h)
    return crop, bbox

def _classify_emotion(model: YOLO, face_bgr: np.ndarray) -> str:
    """Mengklasifikasikan emosi dari potongan gambar wajah (hanya mengembalikan label teks)."""
    label, _ = _classify_emotion_with_confidence(model, face_bgr)
    return label

def _classify_emotion_with_confidence(model: YOLO, face_bgr: np.ndarray) -> tuple[str, float]:
    """Mengklasifikasikan emosi wajah dan mengembalikan tuple (label emosi, tingkat keyakinan 0-1)."""
    results = model.predict(face_bgr, verbose=False)
    if not results or results[0].probs is None:
        return _DEFAULT_EMOTION, 0.0

    top = results[0].probs
    label = str(results[0].names.get(int(top.top1), _DEFAULT_EMOTION)).lower()
    
    try:
        confidence = float(top.top1conf)
    except (AttributeError, TypeError, ValueError):
        confidence = 0.0

    return label, round(confidence, 3)

def _aggregate_labels(labels: list[str], frames_sampled: int) -> VideoEmotionResult:
    """Menggabungkan hasil deteksi ekspresi wajah dari semua frame menjadi nilai ringkasan."""
    total = len(labels)
    counts: dict[str, int] = {}
    for label in labels:
        counts[label] = counts.get(label, 0) + 1

    distribution = {label: round(count / total, 3) for label, count in sorted(counts.items())}
    dominant = max(counts, key=counts.get)

    # Menghitung persentase frame dengan ekspresi tegang/gugup
    nervous_count = sum(1 for label in labels if label in _NERVOUS_LABELS)
    nervous_rate = round(nervous_count / total, 3)

    # Menghitung skor ekspresi berdasarkan nilai valence emosi
    valence_scores = [_EMOTION_VALENCE.get(label, 0.65) for label in labels]
    score = int(max(0, min(100, round(float(np.mean(valence_scores)) * 100))))

    # Menghitung stabilitas ekspresi (flips atau perubahan drastis)
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

def _null_result() -> FrameDetectionResult:
    """Mengembalikan nilai kosong jika tidak ada wajah terdeteksi pada frame kamera langsung."""
    return FrameDetectionResult(_DEFAULT_EMOTION, 0.0, None, None, None, None)

def _sample_frames_opencv(video_path: Path, target_fps: float) -> list[np.ndarray]:
    """Mengambil sampel gambar per detik dari berkas video menggunakan pustaka OpenCV."""
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

def _sample_frames_ffmpeg(video_path: Path, target_fps: float) -> list[np.ndarray]:
    """Fungsi fallback mengekstrak frame menggunakan ffmpeg jika pembaca video OpenCV gagal (misalnya format WebM browser)."""
    with tempfile.TemporaryDirectory(prefix="lumen-video-frames-") as tmp:
        pattern = str(Path(tmp) / "frame_%04d.jpg")
        command = [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(video_path), "-vf", f"fps={target_fps}", "-q:v", "2", pattern
        ]
        try:
            subprocess.run(command, check=True, capture_output=True, timeout=FFMPEG_TIMEOUT_SEC)
        except (FileNotFoundError, subprocess.TimeoutExpired, subprocess.CalledProcessError):
            return []

        frames: list[np.ndarray] = []
        for jpg_path in sorted(Path(tmp).glob("frame_*.jpg")):
            frame = cv2.imread(str(jpg_path))
            if frame is not None:
                frames.append(frame)
        return frames

def _sample_frames(video_path: Path, target_fps: float) -> list[np.ndarray]:
    """Mengambil sampel gambar dari video, otomatis mendeteksi kegagalan OpenCV dan beralih ke ffmpeg."""
    frames = _sample_frames_opencv(video_path, target_fps)
    if frames:
        return frames

    log.info("VideoEmotion: OpenCV gagal membaca berkas; menggunakan ffmpeg fallback.")
    return _sample_frames_ffmpeg(video_path, target_fps)

def _default_result(frames_sampled: int) -> VideoEmotionResult:
    """Kembalian default jika analisis visual tidak dapat berjalan."""
    return VideoEmotionResult(
        dominant_emotion=_DEFAULT_EMOTION,
        emotion_distribution={_DEFAULT_EMOTION: 1.0},
        stability_score=1.0,
        nervous_rate=0.0,
        non_verbal_score=0,
        frames_analyzed=0,
        frames_sampled=frames_sampled,
    )
