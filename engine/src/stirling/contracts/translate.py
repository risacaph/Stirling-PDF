from __future__ import annotations

from pydantic import Field

from stirling.models import ApiModel

from .documents import PageText
from .summarize import ProviderConfig


class TranslateRequest(ApiModel):
    """Translate one document's supplied page text into a target language.

    The caller sends the page text inline (no ingestion or RAG step).
    ``provider`` is optional: when omitted the engine falls back to its own
    configured smart model.
    """

    file_name: str = Field(min_length=1)
    pages: list[PageText] = Field(default_factory=list)
    provider: ProviderConfig | None = None
    target_language: str = Field(min_length=1)


class TranslateResponse(ApiModel):
    """Terminal translation result.

    ``translated_text`` is the document rendered in the target language;
    ``source_language`` is the model's best guess at the original language. This
    is a plain answer from a dedicated endpoint — it carries no ``outcome``
    discriminator.
    """

    translated_text: str = Field(default="")
    source_language: str = Field(default="")
