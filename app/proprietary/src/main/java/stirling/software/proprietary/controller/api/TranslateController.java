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
import stirling.software.proprietary.model.api.ai.TranslateResult;
import stirling.software.proprietary.service.AiEngineClient;
import stirling.software.proprietary.service.PdfContentExtractor;

import tools.jackson.databind.ObjectMapper;

/**
 * Translates a PDF's text into a target language using the AI engine. Extracts the document text,
 * forwards it (with the server-side provider selection) to the engine's translate endpoint, and
 * returns the translated text. Gated by {@code aiEngine.enabled}: {@link AiEngineClient} rejects
 * the call when the engine is disabled.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/ai/tools")
@Tag(name = "AI Tools", description = "Dispatchable AI-backed tools.")
public class TranslateController {

    private static final String TRANSLATE_ENDPOINT = "/api/v1/documents/translate";

    // Bound the request so a very large PDF doesn't produce an unmanageable prompt.
    private static final int MAX_TOTAL_CHARS = 120_000;
    private static final String DEFAULT_TARGET_LANGUAGE = "English";

    private final CustomPDFDocumentFactory pdfDocumentFactory;
    private final PdfContentExtractor pdfContentExtractor;
    private final AiEngineClient aiEngineClient;
    private final ObjectMapper objectMapper;
    private final ApplicationProperties applicationProperties;
    private final UserServiceInterface userService;

    public TranslateController(
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

    @PostMapping(value = "/translate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Translate a PDF's text into a target language using the AI engine")
    public ResponseEntity<TranslateResult> translate(
            @RequestParam("fileInput") MultipartFile fileInput,
            @RequestParam(value = "targetLanguage", required = false, defaultValue = "English")
                    String targetLanguage)
            throws IOException {
        try (PDDocument document = pdfDocumentFactory.load(fileInput, true)) {
            String fileName = safeFileName(fileInput.getOriginalFilename());
            List<AiPageText> pages = extractPages(document);

            TranslateEngineRequest request =
                    new TranslateEngineRequest(
                            fileName, pages, providerPayload(), safeLanguage(targetLanguage));
            String requestBody = objectMapper.writeValueAsString(request);

            String userId = userService != null ? userService.getCurrentUsername() : null;
            String responseJson = aiEngineClient.post(TRANSLATE_ENDPOINT, requestBody, userId);

            TranslateResult result = objectMapper.readValue(responseJson, TranslateResult.class);
            log.debug(
                    "[translate] translated {} ({} pages) into {}",
                    fileName,
                    pages.size(),
                    targetLanguage);
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

    private static String safeLanguage(String targetLanguage) {
        return (targetLanguage == null || targetLanguage.isBlank())
                ? DEFAULT_TARGET_LANGUAGE
                : targetLanguage.trim();
    }

    private static String safeFileName(String originalFilename) {
        String name = Filenames.toSimpleFileName(originalFilename);
        return (name == null || name.isBlank()) ? "document.pdf" : name;
    }

    /** Request body for the engine's {@code /api/v1/documents/translate} endpoint. */
    private record TranslateEngineRequest(
            String fileName,
            List<AiPageText> pages,
            ProviderPayload provider,
            String targetLanguage) {}

    /** Provider selection forwarded to the engine; mirrors the engine's ProviderConfig. */
    private record ProviderPayload(String provider, String model, String apiKey, String baseUrl) {}
}
