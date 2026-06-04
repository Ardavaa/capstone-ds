"""Tests for backend upload validation helpers."""

from __future__ import annotations

import unittest

from api.upload_validation import validate_frame_upload, validate_media_upload
from core.config import MAX_UPLOAD_BYTES


class UploadValidationTest(unittest.TestCase):
    """Validate analysis and live-frame upload guardrails."""

    def test_validate_media_upload_accepts_supported_media(self) -> None:
        """Supported extension and MIME type returns upload metadata."""

        result = validate_media_upload("answer.mp4", "video/mp4", b"media")

        self.assertEqual(result.suffix, ".mp4")
        self.assertEqual(result.size_bytes, 5)

    def test_validate_media_upload_rejects_empty_file(self) -> None:
        """Empty analysis uploads are rejected before processing."""

        with self.assertRaisesRegex(ValueError, "empty"):
            validate_media_upload("answer.mp4", "video/mp4", b"")

    def test_validate_media_upload_rejects_unsupported_extension(self) -> None:
        """Non-media file extensions are rejected."""

        with self.assertRaisesRegex(ValueError, "Unsupported media file type"):
            validate_media_upload("notes.txt", "text/plain", b"hello")

    def test_validate_media_upload_rejects_unsupported_mime(self) -> None:
        """Supported extension with an unsupported MIME type is rejected."""

        with self.assertRaisesRegex(ValueError, "Unsupported media MIME type"):
            validate_media_upload("answer.mp4", "application/octet-stream", b"media")

    def test_validate_media_upload_rejects_oversized_file(self) -> None:
        """Oversized uploads are rejected using the configured byte limit."""

        with self.assertRaisesRegex(ValueError, "too large"):
            validate_media_upload("answer.mp4", "video/mp4", b"x" * (MAX_UPLOAD_BYTES + 1))

    def test_validate_frame_upload_accepts_jpeg(self) -> None:
        """JPEG frame uploads are allowed for live detection."""

        size = validate_frame_upload("image/jpeg", b"frame")

        self.assertEqual(size, 5)

    def test_validate_frame_upload_rejects_non_image_mime(self) -> None:
        """Live frame uploads must be JPEG or PNG."""

        with self.assertRaisesRegex(ValueError, "Unsupported frame MIME type"):
            validate_frame_upload("text/plain", b"frame")


if __name__ == "__main__":
    unittest.main()
