package stirling.software.proprietary.controller.api;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.github.pixee.security.Filenames;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.extern.slf4j.Slf4j;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.service.UserServiceInterface;
import stirling.software.proprietary.model.api.ai.AiPageText;
import stirling.software.proprietary.model.api.ai.SummaryResult;
import stirling.software.proprietary.service.AiEngineClient;
import stirling.software.proprietary.service.PdfContentExtractor;

import tools.jackson.databind.ObjectMapper;

/**
 * Summarizes a PDF using the AI engine. Extracts the document text, forwards it (with the
 * server-side provider selection) to the engine's summarize endpoint, and returns the structured
 * summary. Gated by {@code aiEngine.enabled}: {@link AiEngineClient} rejects the call when the
 * engine is disabled.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ai/tools")
@Tag(name = "AI Tools", description = "Dispatchable AI-backed tools.")
public class SummarizeController {

    private static final String SUMMARIZE_ENDPOINT = "/api/v1/documents/summarize";

    // Bound the request so a very large PDF doesn't produce an unmanageable prompt.
    private static final int MAX_TOTAL_CHARS = 120_000;
    private static final int MIN_WORDS = 20;
    private static final int MAX_WORDS = 2000;

    private final CustomPDFDocumentFactory pdfDocumentFactory;
    private final PdfContentExtractor pdfContentExtractor;
    private final AiEngineClient aiEngineClient;
    private final ObjectMapper objectMapper;
    private final ApplicationProperties applicationProperties;
    private final UserServiceInterface userService;

    public SummarizeController(
            CustomPDFDocumentFactory pdfDocumentFactory,
            PdfContentExtractor pdfContentExtractor,
            AiEngineClient aiEngineClient,
            ObjectMapper objectMapper,
            ApplicationProperties applicationProperties,
            @Autowired(required = false) UserServiceInterface userService) {
        this.pdfDocumentFactory = pdfDocumentFactory;
        this.pdfContentExtractor = pdfContentExtractor;
        this.aiEngineClient = aiEngineClient;
        this.objectMapper = objectMapper;
        this.applicationProperties = applicationProperties;
        this.userService = userService;
    }

    @PostMapping(value = "/summarize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Summarize a PDF using the AI engine",
            description =
                    "Extracts the document text and asks the configured AI provider for a concise"
                            + " summary and key points. Requires the AI engine to be enabled and a"
                            + " provider configured in settings. Input:PDF Output:JSON Type:SISO")
    public ResponseEntity<SummaryResult> summarize(
            @RequestParam("fileInput") MultipartFile fileInput,
            @RequestParam(value = "maxWords", required = false, defaultValue = "250") int maxWords)
            throws IOException {
        try (PDDocument document = pdfDocumentFactory.load(fileInput, true)) {
            String fileName = safeFileName(fileInput.getOriginalFilename());
            List<AiPageText> pages = extractPages(document);

            SummarizeEngineRequest request =
                    new SummarizeEngineRequest(
                            fileName, pages, providerPayload(), clampWords(maxWords));
            String requestBody = objectMapper.writeValueAsString(request);

            String userId = userService != null ? userService.getCurrentUsername() : null;
            String responseJson = aiEngineClient.post(SUMMARIZE_ENDPOINT, requestBody, userId);

            SummaryResult result = objectMapper.readValue(responseJson, SummaryResult.class);
            log.debug("[summarize] summarized {} ({} pages of text)", fileName, pages.size());
            return ResponseEntity.ok(result);
        }
    }

    private List<AiPageText> extractPages(PDDocument document) throws IOException {
        List<AiPageText> pages = new ArrayList<>();
        int totalChars = 0;
        int pageCount = document.getNumberOfPages();
        for (int pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
            String text = pdfContentExtractor.extractPageTextRaw(document, pageNumber);
            if (text == null || text.isBlank()) {
                continue;
            }
            if (totalChars + text.length() > MAX_TOTAL_CHARS) {
                pages.add(
                        new AiPageText(
                                pageNumber, text.substring(0, MAX_TOTAL_CHARS - totalChars)));
                break;
            }
            pages.add(new AiPageText(pageNumber, text));
            totalChars += text.length();
        }
        return pages;
    }

    /**
     * Provider selection from server-side settings, or null to let the engine use its own
     * configured model. The API key stays server-side except on this internal engine call.
     */
    private ProviderPayload providerPayload() {
        ApplicationProperties.AiEngine ai = applicationProperties.getAiEngine();
        String provider = ai.getProvider();
        if (provider == null || provider.isBlank()) {
            return null;
        }
        return new ProviderPayload(
                provider, ai.getModel(), blankToNull(ai.getApiKey()), blankToNull(ai.getBaseUrl()));
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private static int clampWords(int maxWords) {
        return Math.min(MAX_WORDS, Math.max(MIN_WORDS, maxWords));
    }

    private static String safeFileName(String originalFilename) {
        String name = Filenames.toSimpleFileName(originalFilename);
        return (name == null || name.isBlank()) ? "document.pdf" : name;
    }

    /** Request body for the engine's {@code /api/v1/documents/summarize} endpoint. */
    private record SummarizeEngineRequest(
            String fileName, List<AiPageText> pages, ProviderPayload provider, int maxWords) {}

    /** Provider selection forwarded to the engine; mirrors the engine's ProviderConfig. */
    private record ProviderPayload(String provider, String model, String apiKey, String baseUrl) {}
}
