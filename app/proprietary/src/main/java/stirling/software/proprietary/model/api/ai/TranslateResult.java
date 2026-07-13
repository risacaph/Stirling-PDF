package stirling.software.proprietary.model.api.ai;

/**
 * Structured translation returned by the AI engine's translate endpoint and relayed to the client.
 * Mirrors the engine's {@code TranslateResponse} ({@code translatedText}, {@code sourceLanguage}).
 */
public record TranslateResult(String translatedText, String sourceLanguage) {}
