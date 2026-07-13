from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from stirling.api import app
from stirling.api.dependencies import get_translate_agent
from stirling.contracts import TranslateRequest, TranslateResponse


class StubTranslateAgent:
    """Stands in for TranslateAgent so route tests don't call a model."""

    def __init__(self, response: TranslateResponse) -> None:
        self._response = response

    async def translate(self, _request: TranslateRequest) -> TranslateResponse:
        return self._response


@pytest.fixture
def translate_client() -> Iterator[TestClient]:
    app.dependency_overrides[get_translate_agent] = lambda: StubTranslateAgent(
        TranslateResponse(translated_text="Bonjour le monde.", source_language="English")
    )
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_translate_agent, None)


def test_translate_returns_translation(translate_client: TestClient) -> None:
    response = translate_client.post(
        "/api/v1/documents/translate",
        json={
            "fileName": "report.pdf",
            "pages": [{"pageNumber": 1, "text": "Hello world."}],
            "targetLanguage": "French",
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "translatedText": "Bonjour le monde.",
        "sourceLanguage": "English",
    }


def test_translate_accepts_provider_config(translate_client: TestClient) -> None:
    response = translate_client.post(
        "/api/v1/documents/translate",
        json={
            "fileName": "report.pdf",
            "pages": [],
            "targetLanguage": "German",
            "provider": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "apiKey": "sk-test",
            },
        },
    )
    assert response.status_code == 200


def test_translate_accepts_empty_pages(translate_client: TestClient) -> None:
    response = translate_client.post(
        "/api/v1/documents/translate",
        json={"fileName": "blank.pdf", "pages": [], "targetLanguage": "Spanish"},
    )
    assert response.status_code == 200


def test_translate_rejects_empty_file_name(translate_client: TestClient) -> None:
    response = translate_client.post(
        "/api/v1/documents/translate",
        json={"fileName": "", "pages": [], "targetLanguage": "French"},
    )
    assert response.status_code == 422


def test_translate_rejects_empty_target_language(translate_client: TestClient) -> None:
    response = translate_client.post(
        "/api/v1/documents/translate",
        json={"fileName": "report.pdf", "pages": [], "targetLanguage": ""},
    )
    assert response.status_code == 422
