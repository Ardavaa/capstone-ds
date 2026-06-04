"""Lightweight API contract tests that avoid loading ML models."""

from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from main import app


class AnalyzeRouteContractTest(unittest.TestCase):
    """Validate upload guardrails on the public analyze endpoint."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

    def test_analyze_rejects_empty_upload(self) -> None:
        """Empty media uploads return 400 before pipeline work starts."""

        response = self.client.post(
            "/api/analyze",
            files={"file": ("empty.mp4", b"", "video/mp4")},
            data={"question_topic": "software engineer interview"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.json()["detail"].lower())

    def test_analyze_rejects_unsupported_extension(self) -> None:
        """Non-media extensions are rejected with a 400 response."""

        response = self.client.post(
            "/api/analyze",
            files={"file": ("notes.txt", b"hello", "text/plain")},
            data={"question_topic": "software engineer interview"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("unsupported", response.json()["detail"].lower())

    def test_preflight_unknown_model_returns_404(self) -> None:
        """Unknown preflight keys do not trigger model loading."""

        response = self.client.get("/api/preflight/unknown-model")

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
