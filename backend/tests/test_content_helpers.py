"""Tests for interview content heuristic helpers."""

from __future__ import annotations

import unittest

from ml_pipeline.text.content_helpers import (
    completeness_score,
    derive_rubric_points,
    is_behavioral_question,
    rubric_coverage_score,
    star_structure_score,
)


class ContentHelpersTest(unittest.TestCase):
    """Validate rubric and completeness heuristics without ML models."""

    def test_behavioral_question_detection(self) -> None:
        """STAR-style prompts are classified as behavioral."""

        self.assertTrue(
            is_behavioral_question("Tell me about a time you handled conflict."),
        )
        self.assertFalse(is_behavioral_question("What is a LEFT JOIN in SQL?"))

    def test_rubric_includes_star_points_for_behavioral_prompts(self) -> None:
        """Behavioral questions add STAR rubric checkpoints."""

        points = derive_rubric_points(
            "Describe a time you improved a process.",
            "data analyst interview",
        )

        self.assertIn("specific situation or context", points)
        self.assertIn("measurable result or outcome", points)

    def test_rubric_coverage_counts_hits(self) -> None:
        """Rubric coverage increases when answer mentions checkpoints."""

        rubric = ["sql", "dashboard", "analytics"]
        low = rubric_coverage_score("I built a dashboard.", rubric)
        high = rubric_coverage_score(
            "I used SQL on the analytics dashboard to track KPIs.",
            rubric,
        )

        self.assertLess(low, high)

    def test_star_structure_detects_multiple_dimensions(self) -> None:
        """STAR score rises when answer includes situation, action, and result."""

        weak = star_structure_score("I faced a challenge and solved it.")
        strong = star_structure_score(
            "During my internship the dashboard crashed. "
            "I coordinated with engineering, deployed a patch, and improved uptime by 20%.",
        )

        self.assertLess(weak, strong)

    def test_completeness_prefers_longer_structured_answers(self) -> None:
        """Longer multi-sentence answers score higher on completeness."""

        short = completeness_score("I did the task.", behavioral=False)
        long = completeness_score(
            "First I gathered requirements from stakeholders. "
            "Then I implemented the solution in Python. "
            "Finally we measured a 15% improvement in conversion.",
            behavioral=False,
        )

        self.assertLess(short, long)


if __name__ == "__main__":
    unittest.main()
