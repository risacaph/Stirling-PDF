package stirling.software.proprietary.model.api.ai;

import java.util.List;

/**
 * Structured summary returned by the AI engine's summarize endpoint and relayed to the client.
 * Mirrors the engine's {@code SummarizeResponse} ({@code summary}, {@code keyPoints}).
 */
public record SummaryResult(String summary, List<String> keyPoints) {}
