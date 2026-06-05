"""Tests for video frame sampling used by post-recording facial emotion analysis."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from ml_pipeline.video.emotion import _sample_frames


class VideoFrameSamplingTest(unittest.TestCase):
    """Ensure browser-style WebM uploads yield frames for YOLO analysis."""

    def setUp(self) -> None:
        if shutil.which("ffmpeg") is None:
            self.skipTest("ffmpeg is required for frame sampling tests")

        self._tmpdir = tempfile.TemporaryDirectory()
        self.webm_path = Path(self._tmpdir.name) / "browser-style.webm"
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                "color=c=black:s=640x480:d=4",
                "-c:v",
                "libvpx-vp9",
                "-an",
                str(self.webm_path),
            ],
            check=True,
        )

    def tearDown(self) -> None:
        self._tmpdir.cleanup()

    def test_sample_frames_reads_browser_webm_via_ffmpeg_fallback(self) -> None:
        """WebM that OpenCV cannot open must still produce sampled frames."""

        frames = _sample_frames(self.webm_path, target_fps=1.0)

        self.assertGreater(len(frames), 0)
        self.assertEqual(frames[0].ndim, 3)


if __name__ == "__main__":
    unittest.main()
