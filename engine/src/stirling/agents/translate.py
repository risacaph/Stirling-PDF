from __future__ import annotations

from pydantic_ai import Agent
from pydantic_ai.output import NativeOutput

from stirling.contracts import PageText, TranslateRequest, TranslateResponse
from stirling.services import AppRuntime, build_provider_model


def _system_prompt(target_language: str) -> str:
    return (
        "You are an expert document translator.\n"
        "\n"
        "Rules:\n"
        f"- Translate the document faithfully into {target_language}.\n"
        "- Preserve meaning, tone, structure and paragraph breaks; do not summarize or omit content.\n"
        "- Keep proper nouns, numbers, URLs and code unchanged.\n"
        "- Also report the document's original language as source_language.\n"
        "- Return only the translation, with no added commentary."
    )


def _format_pages(pages: list[PageText]) -> str:
    if not pages:
        return "(no extractable text)"
    return "\n\n".join(f"[Page {page.page_number}]\n{page.text}" for page in pages)


class TranslateAgent:
    """Translates a document into a target language from its supplied page text.

    The model is chosen per request: when the request carries an explicit
    provider config (from backend settings) it is built on the fly, otherwise
    the engine's configured smart model is used.
    """

    def __init__(self, runtime: AppRuntime) -> None:
        self.runtime = runtime

    async def translate(self, request: TranslateRequest) -> TranslateResponse:
        model = build_provider_model(request.provider) if request.provider else self.runtime.smart_model
        agent = Agent(
            model=model,
            output_type=NativeOutput(TranslateResponse),
            system_prompt=_system_prompt(request.target_language),
            model_settings=self.runtime.smart_model_settings,
        )
        prompt = f"Document file name: {request.file_name}\n\nDocument content:\n{_format_pages(request.pages)}"
        result = await agent.run(prompt)
        return result.output
