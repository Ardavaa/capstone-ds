"""Tests for ffmpeg audio extraction failure handling."""

from __future__ import annotations

import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch

from ml_pipeline.audio.extraction import (
    AudioExtractionError,
    AudioExtractionTimeoutError,
    extract_audio_to_wav,
)


class AudioExtractionTest(unittest.TestCase):
    """Validate sanitized ffmpeg error paths."""

    def test_extract_audio_times_out_with_sanitized_error(self) -> None:
        """ffmpeg timeout raises the public timeout exception."""

        with patch(
            "ml_pipeline.audio.extraction._count_audio_streams",
            return_value=1,
        ):
            with patch("ml_pipeline.audio.extraction.subprocess.run") as run:
                run.side_effect = subprocess.TimeoutExpired(cmd=["ffmpeg"], timeout=60)

                with self.assertRaisesRegex(AudioExtractionTimeoutError, "timed out"):
                    extract_audio_to_wav(Path("input.mp4"), Path("output.wav"))

    def test_extract_audio_decode_failure_is_sanitized(self) -> None:
        """Raw ffmpeg stderr is not exposed in the exception message."""

        with patch(
            "ml_pipeline.audio.extraction._count_audio_streams",
            return_value=1,
        ):
            with patch("ml_pipeline.audio.extraction.subprocess.run") as run:
                run.side_effect = subprocess.CalledProcessError(
                    returncode=1,
                    cmd=["ffmpeg"],
                    stderr="C:/private/path/input.mp4: Invalid data found",
                )

                with self.assertRaises(AudioExtractionError) as ctx:
                    extract_audio_to_wav(Path("input.mp4"), Path("output.wav"))

        message = str(ctx.exception)
        self.assertIn("could not be decoded", message)
        self.assertNotIn("C:/private/path", message)

    def test_extract_audio_without_audio_stream_is_clear(self) -> None:
        """Uploads with no audio stream return a dedicated error message."""

        with patch(
            "ml_pipeline.audio.extraction._count_audio_streams",
            return_value=0,
        ):
            with self.assertRaisesRegex(AudioExtractionError, "no audio track"):
                extract_audio_to_wav(Path("input.webm"), Path("output.wav"))


if __name__ == "__main__":
    unittest.main()
