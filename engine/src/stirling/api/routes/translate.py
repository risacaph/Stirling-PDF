from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from stirling.agents import TranslateAgent
from stirling.api.dependencies import get_translate_agent
from stirling.contracts import TranslateRequest, TranslateResponse

router = APIRouter(prefix="/api/v1/documents/translate", tags=["translate"])


@router.post("", response_model=TranslateResponse)
async def translate_document(
    request: TranslateRequest,
    agent: Annotated[TranslateAgent, Depends(get_translate_agent)],
) -> TranslateResponse:
    """Translate a document into a target language from its supplied page text.

    The caller sends the page text inline, so no per-user document storage is
    touched here — the request is self-contained.
    """
    return await agent.translate(request)
