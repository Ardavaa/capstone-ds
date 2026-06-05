"""Validation helpers for uploaded interview media."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from core.config import (
    ALLOWED_FRAME_MIME_TYPES,
    ALLOWED_UPLOAD_EXTENSIONS,
    ALLOWED_UPLOAD_MIME_TYPES,
    MAX_FRAME_UPLOAD_BYTES,
    MAX_UPLOAD_BYTES,
)


@dataclass(frozen=True)
class UploadValidationResult:
    """Validated upload metadata used by the analysis route.

    Attributes:
        suffix: Lowercase file extension to preserve for temporary files.
        size_bytes: Size of the uploaded file in bytes.
    """

    suffix: str
    size_bytes: int


def validate_media_upload(
    filename: str | None,
    content_type: str | None,
    contents: bytes,
) -> UploadValidationResult:
    """Validate a media upload before it reaches ffmpeg or model inference.

    Args:
        filename: Original client-provided filename.
        content_type: Multipart content type sent by the client.
        contents: Uploaded file bytes.

    Returns:
        Validated upload metadata.

    Raises:
        ValueError: If the upload is empty, too large, or has an unsupported
            file extension or MIME type.
    """

    size_bytes = len(contents)
    if size_bytes == 0:
        raise ValueError("Uploaded file is empty.")
    if size_bytes > MAX_UPLOAD_BYTES:
        raise ValueError(
            f"Uploaded file is too large. Maximum size is {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    suffix = Path(filename or "").suffix.lower()
    if suffix not in ALLOWED_UPLOAD_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_UPLOAD_EXTENSIONS))
        raise ValueError(f"Unsupported media file type. Allowed extensions: {allowed}.")

    normalized_content_type = (content_type or "").split(";", maxsplit=1)[0].strip().lower()
    # Browsers often send application/octet-stream when the Blob has no MIME type.
    trusted_generic_types = frozenset({"application/octet-stream"})
    if (
        normalized_content_type
        and normalized_content_type not in ALLOWED_UPLOAD_MIME_TYPES
        and normalized_content_type not in trusted_generic_types
    ):
        raise ValueError("Unsupported media MIME type.")

    return UploadValidationResult(suffix=suffix, size_bytes=size_bytes)


def validate_frame_upload(content_type: str | None, contents: bytes) -> int:
    """Validate a live camera frame upload.

    Args:
        content_type: Multipart content type sent by the client.
        contents: Encoded image bytes.

    Returns:
        Uploaded frame size in bytes.

    Raises:
        ValueError: If the frame is empty, too large, or not JPEG/PNG.
    """

    size_bytes = len(contents)
    if size_bytes == 0:
        raise ValueError("Empty frame upload.")
    if size_bytes > MAX_FRAME_UPLOAD_BYTES:
        raise ValueError(
            f"Frame upload is too large. Maximum size is {MAX_FRAME_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    normalized_content_type = (content_type or "").split(";", maxsplit=1)[0].strip().lower()
    if normalized_content_type not in ALLOWED_FRAME_MIME_TYPES:
        raise ValueError("Unsupported frame MIME type.")

    return size_bytes
