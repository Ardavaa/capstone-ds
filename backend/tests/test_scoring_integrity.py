"""Tests for filler detection and no-analysis scoring behavior."""

from __future__ import annotations

import unittest

from ml_pipeline.audio.analysis import DeliveryAnalysisResult, detect_filler_words
from ml_pipeline.audio.emotion import EmotionAnalysisResult
from ml_pipeline.fusion.scorer import run_fusion
from ml_pipeline.video.emotion import VideoEmotionResult


class ScoringIntegrityTest(unittest.TestCase):
    """Validate scoring rules that affect interview fairness."""

    def test_common_transition_words_are_not_counted_as_fillers(self) -> None:
        """Words like 'so', 'well', and 'right' should not be penalized alone."""

        count, rate, found = detect_filler_words(
            "So now I will explain the right approach, then discuss the tradeoff well.",
        )

        self.assertEqual(count, 0)
        self.assertEqual(rate, 0.0)
        self.assertEqual(found, [])

    def test_actual_fillers_are_still_detected(self) -> None:
        """Conservative filler phrases still count when present."""

        count, _rate, found = detect_filler_words("Um, I mean, you know, this works.")

        self.assertEqual(count, 3)
        self.assertEqual(found, ["you know", "i mean", "um"])

    def test_missing_video_analysis_is_excluded_from_final_score(self) -> None:
        """Unavailable video analysis should not contribute a neutral score."""

        delivery = DeliveryAnalysisResult(
            wpm=140.0,
            filler_count=0,
            filler_rate=0.0,
            avg_pause_sec=0.7,
            longest_silence_sec=0.8,
            duration_sec=30.0,
            delivery_score=20,
            filler_words_found=[],
        )
        emotion = EmotionAnalysisResult(
            dominant_emotion="neutral",
            emotion_distribution={"neutral": 1.0},
            stability_score=1.0,
            nervous_rate=0.0,
            emotion_score=0,
            chunks_analyzed=0,
        )
        video = VideoEmotionResult(
            dominant_emotion="neutral",
            emotion_distribution={"neutral": 1.0},
            stability_score=1.0,
            nervous_rate=0.0,
            non_verbal_score=0,
            frames_analyzed=0,
            frames_sampled=10,
        )

        result = run_fusion(
            content_score=20,
            delivery=delivery,
            non_verbal_score=video.non_verbal_score,
            transcription="short answer",
            emotion=emotion,
            video_emotion=video,
            blended_delivery_score=delivery.delivery_score,
        )

        self.assertEqual(result.final_score, 20)
        self.assertEqual(result.non_verbal_score, 0)
        self.assertIn("No face detected", result.feedback["non_verbal"])


if __name__ == "__main__":
    unittest.main()
