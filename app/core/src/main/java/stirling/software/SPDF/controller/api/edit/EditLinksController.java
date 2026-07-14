package stirling.software.SPDF.controller.api.edit;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.interactive.action.PDAction;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionGoTo;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionURI;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDBorderStyleDictionary;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDNamedDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDPageDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDPageXYZDestination;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.util.ExceptionUtils;
import stirling.software.common.util.GeneralUtils;
import stirling.software.common.util.TempFileManager;
import stirling.software.common.util.WebResponseUtils;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/edit/links")
@Tag(name = "Edit", description = "Inspect and edit document structure such as link annotations.")
@RequiredArgsConstructor
@Slf4j
public class EditLinksController {

    private final CustomPDFDocumentFactory pdfDocumentFactory;
    private final ObjectMapper objectMapper;
    private final TempFileManager tempFileManager;

    /** A link annotation described in fractional page coordinates (0-1, top-left origin). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record LinkInfo(
            int pageIndex,
            int annotationIndex,
            float x,
            float y,
            float width,
            float height,
            String type,
            String uri,
            Integer targetPage) {}

    public record LinkExtraction(int pageCount, List<LinkInfo> links) {}

    public record LinkRemoval(Integer pageIndex, Integer annotationIndex) {}

    public record LinkAddition(
            Integer pageIndex,
            Float x,
            Float y,
            Float width,
            Float height,
            String type,
            String uri,
            Integer targetPage) {}

    public record LinkOperations(List<LinkRemoval> removals, List<LinkAddition> additions) {}

    @PostMapping(value = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "List link annotations in a PDF",
            description =
                    "Returns every link annotation with fractional page coordinates and its"
                            + " target: an external URI or an internal page. Input:PDF Output:JSON"
                            + " Type:SISO")
    public ResponseEntity<LinkExtraction> extractLinks(
            @Parameter(
                            description = "The input PDF file",
                            required = true,
                            content =
                                    @Content(
                                            mediaType = MediaType.APPLICATION_PDF_VALUE,
                                            schema = @Schema(type = "string", format = "binary")))
                    @RequestParam("fileInput")
                    MultipartFile fileInput)
            throws IOException {
        requirePdf(fileInput);
        try (PDDocument document = pdfDocumentFactory.load(fileInput, true)) {
            List<LinkInfo> links = new ArrayList<>();
            int pageIndex = 0;
            for (PDPage page : document.getPages()) {
                List<PDAnnotation> annotations = page.getAnnotations();
                for (int i = 0; i < annotations.size(); i++) {
                    if (annotations.get(i) instanceof PDAnnotationLink link) {
                        LinkInfo info = describeLink(document, page, pageIndex, i, link);
                        if (info != null) {
                            links.add(info);
                        }
                    }
                }
                pageIndex++;
            }
            return ResponseEntity.ok(new LinkExtraction(document.getNumberOfPages(), links));
        }
    }

    @PostMapping(value = "/apply", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Add and remove link annotations in a PDF",
            description =
                    "Applies a set of link edits: removes the referenced link annotations and"
                            + " adds new links (external URI or internal page) at fractional page"
                            + " coordinates. Input:PDF Output:PDF Type:SISO")
    public ResponseEntity<Resource> applyLinkEdits(
            @Parameter(
                            description = "The input PDF file",
                            required = true,
                            content =
                                    @Content(
                                            mediaType = MediaType.APPLICATION_PDF_VALUE,
                                            schema = @Schema(type = "string", format = "binary")))
                    @RequestParam("fileInput")
                    MultipartFile fileInput,
            @Parameter(
                            description =
                                    "JSON object with 'removals' (pageIndex + annotationIndex"
                                            + " pairs) and 'additions' (new links with fractional"
                                            + " geometry and a 'uri' or 'page' target)")
                    @RequestPart(value = "operations", required = false)
                    byte[] operationsPayload)
            throws IOException {
        requirePdf(fileInput);
        String rawOperations =
                operationsPayload == null || operationsPayload.length == 0
                        ? null
                        : new String(operationsPayload, StandardCharsets.UTF_8);
        if (rawOperations == null || rawOperations.isBlank()) {
            throw ExceptionUtils.createIllegalArgumentException(
                    "error.dataRequired",
                    "{0} must contain at least one operation",
                    "operations payload");
        }
        LinkOperations operations;
        try {
            operations = objectMapper.readValue(rawOperations, LinkOperations.class);
        } catch (JacksonException e) {
            throw ExceptionUtils.createIllegalArgumentException(
                    "error.invalidFormat",
                    "Invalid {0} format: {1}",
                    "operations payload",
                    e.getMessage());
        }
        List<LinkRemoval> removals =
                operations.removals() == null ? List.of() : operations.removals();
        List<LinkAddition> additions =
                operations.additions() == null ? List.of() : operations.additions();
        if (removals.isEmpty() && additions.isEmpty()) {
            throw ExceptionUtils.createIllegalArgumentException(
                    "error.dataRequired",
                    "{0} must contain at least one operation",
                    "operations payload");
        }

        try (PDDocument document = pdfDocumentFactory.load(fileInput)) {
            applyRemovals(document, removals);
            applyAdditions(document, additions);
            return WebResponseUtils.pdfDocToWebResponse(
                    document,
                    GeneralUtils.generateFilename(fileInput.getOriginalFilename(), "_links.pdf"),
                    tempFileManager);
        }
    }

    private LinkInfo describeLink(
            PDDocument document,
            PDPage page,
            int pageIndex,
            int annotationIndex,
            PDAnnotationLink link) {
        PDRectangle rectangle = link.getRectangle();
        PDRectangle cropBox = page.getCropBox();
        if (rectangle == null
                || cropBox == null
                || cropBox.getWidth() <= 0
                || cropBox.getHeight() <= 0) {
            return null;
        }

        float x = (rectangle.getLowerLeftX() - cropBox.getLowerLeftX()) / cropBox.getWidth();
        float relativeY = rectangle.getLowerLeftY() - cropBox.getLowerLeftY();
        float y = (cropBox.getHeight() - relativeY - rectangle.getHeight()) / cropBox.getHeight();
        float width = rectangle.getWidth() / cropBox.getWidth();
        float height = rectangle.getHeight() / cropBox.getHeight();

        // The client renders pages with /Rotate applied, so report geometry in that
        // displayed space rather than the un-rotated user space of the /Rect.
        float[] displayed =
                unrotatedToDisplayed(normalizeRotation(page.getRotation()), x, y, width, height);
        x = displayed[0];
        y = displayed[1];
        width = displayed[2];
        height = displayed[3];

        String type = "other";
        String uri = null;
        Integer targetPage = null;
        try {
            PDAction action = link.getAction();
            if (action instanceof PDActionURI uriAction) {
                type = "uri";
                uri = uriAction.getURI();
            } else {
                PDDestination destination =
                        action instanceof PDActionGoTo gotoAction
                                ? gotoAction.getDestination()
                                : link.getDestination();
                if (destination instanceof PDNamedDestination namedDestination) {
                    destination =
                            document.getDocumentCatalog()
                                    .findNamedDestinationPage(namedDestination);
                }
                if (destination instanceof PDPageDestination pageDestination) {
                    type = "page";
                    int number = pageDestination.retrievePageNumber();
                    targetPage = number >= 0 ? number + 1 : null;
                }
            }
        } catch (IOException e) {
            log.debug(
                    "Unable to resolve link target on page {}: {}", pageIndex + 1, e.getMessage());
        }
        return new LinkInfo(pageIndex, annotationIndex, x, y, width, height, type, uri, targetPage);
    }

    private void applyRemovals(PDDocument document, List<LinkRemoval> removals) throws IOException {
        Map<Integer, List<Integer>> removalsByPage = new HashMap<>();
        for (LinkRemoval removal : removals) {
            if (removal == null
                    || removal.pageIndex() == null
                    || removal.annotationIndex() == null) {
                throw ExceptionUtils.createIllegalArgumentException(
                        "error.invalidFormat",
                        "Invalid {0} format: {1}",
                        "link removal",
                        "pageIndex and annotationIndex are required");
            }
            removalsByPage
                    .computeIfAbsent(removal.pageIndex(), key -> new ArrayList<>())
                    .add(removal.annotationIndex());
        }
        for (Map.Entry<Integer, List<Integer>> entry : removalsByPage.entrySet()) {
            int pageIndex = entry.getKey();
            if (pageIndex < 0 || pageIndex >= document.getNumberOfPages()) {
                throw ExceptionUtils.createIllegalArgumentException(
                        "error.invalidFormat",
                        "Invalid {0} format: {1}",
                        "link removal",
                        "page index out of range: " + pageIndex);
            }
            List<PDAnnotation> annotations = document.getPage(pageIndex).getAnnotations();
            List<Integer> indices =
                    entry.getValue().stream().distinct().sorted(Comparator.reverseOrder()).toList();
            for (int annotationIndex : indices) {
                if (annotationIndex < 0
                        || annotationIndex >= annotations.size()
                        || !(annotations.get(annotationIndex) instanceof PDAnnotationLink)) {
                    throw ExceptionUtils.createIllegalArgumentException(
                            "error.invalidFormat",
                            "Invalid {0} format: {1}",
                            "link removal",
                            "no link annotation at index "
                                    + annotationIndex
                                    + " on page "
                                    + (pageIndex + 1));
                }
                annotations.remove(annotationIndex);
            }
        }
    }

    private void applyAdditions(PDDocument document, List<LinkAddition> additions)
            throws IOException {
        for (LinkAddition addition : additions) {
            if (addition == null || addition.pageIndex() == null) {
                throw ExceptionUtils.createIllegalArgumentException(
                        "error.invalidFormat",
                        "Invalid {0} format: {1}",
                        "link addition",
                        "pageIndex is required");
            }
            int pageIndex = addition.pageIndex();
            if (pageIndex < 0 || pageIndex >= document.getNumberOfPages()) {
                throw ExceptionUtils.createIllegalArgumentException(
                        "error.invalidFormat",
                        "Invalid {0} format: {1}",
                        "link addition",
                        "page index out of range: " + pageIndex);
            }
            PDPage page = document.getPage(pageIndex);

            PDAnnotationLink link = new PDAnnotationLink();
            link.setRectangle(toLinkRectangle(page, addition));
            PDBorderStyleDictionary borderStyle = new PDBorderStyleDictionary();
            borderStyle.setWidth(0);
            borderStyle.setStyle(PDBorderStyleDictionary.STYLE_SOLID);
            link.setBorderStyle(borderStyle);
            link.setPrinted(true);
            link.setAction(toLinkAction(document, addition));

            page.getAnnotations().add(link);
        }
    }

    private PDAction toLinkAction(PDDocument document, LinkAddition addition) {
        if ("uri".equalsIgnoreCase(addition.type())) {
            if (addition.uri() == null || addition.uri().isBlank()) {
                throw ExceptionUtils.createIllegalArgumentException(
                        "error.invalidFormat",
                        "Invalid {0} format: {1}",
                        "link addition",
                        "uri is required for URI links");
            }
            PDActionURI action = new PDActionURI();
            action.setURI(addition.uri().trim());
            return action;
        }
        if ("page".equalsIgnoreCase(addition.type())) {
            Integer targetPage = addition.targetPage();
            if (targetPage == null || targetPage < 1 || targetPage > document.getNumberOfPages()) {
                throw ExceptionUtils.createIllegalArgumentException(
                        "error.invalidFormat",
                        "Invalid {0} format: {1}",
                        "link addition",
                        "targetPage out of range: " + targetPage);
            }
            PDPage target = document.getPage(targetPage - 1);
            PDPageXYZDestination destination = new PDPageXYZDestination();
            destination.setPage(target);
            destination.setLeft(Math.round(target.getCropBox().getLowerLeftX()));
            destination.setTop(Math.round(target.getCropBox().getUpperRightY()));
            // A zero zoom keeps the viewer's current zoom level (PDF 32000-1, table 151).
            destination.setZoom(0);
            PDActionGoTo action = new PDActionGoTo();
            action.setDestination(destination);
            return action;
        }
        throw ExceptionUtils.createIllegalArgumentException(
                "error.invalidFormat",
                "Invalid {0} format: {1}",
                "link addition",
                "unsupported link type: " + addition.type());
    }

    /**
     * Converts fractional page geometry (0-1, top-left origin, in the displayed/rotated space the
     * client draws in) into a PDF rectangle against the page CropBox — the same conversion the form
     * builder uses for widget placement, plus a /Rotate-aware transform.
     */
    private PDRectangle toLinkRectangle(PDPage page, LinkAddition addition) {
        float fracX = addition.x() != null ? addition.x() : 0f;
        float fracY = addition.y() != null ? addition.y() : 0f;
        float fracW = addition.width() != null ? addition.width() : 0f;
        float fracH = addition.height() != null ? addition.height() : 0f;
        if (fracW <= 0f || fracH <= 0f) {
            throw ExceptionUtils.createIllegalArgumentException(
                    "error.invalidFormat",
                    "Invalid {0} format: {1}",
                    "link addition",
                    "link rectangle must have a positive size");
        }
        float[] unrotated =
                displayedToUnrotated(
                        normalizeRotation(page.getRotation()), fracX, fracY, fracW, fracH);
        fracX = unrotated[0];
        fracY = unrotated[1];
        fracW = unrotated[2];
        fracH = unrotated[3];
        PDRectangle cropBox = page.getCropBox();
        float width = fracW * cropBox.getWidth();
        float height = fracH * cropBox.getHeight();
        float pdfX = fracX * cropBox.getWidth() + cropBox.getLowerLeftX();
        float pdfY = (1f - fracY - fracH) * cropBox.getHeight() + cropBox.getLowerLeftY();
        return new PDRectangle(pdfX, pdfY, width, height);
    }

    static int normalizeRotation(int rotation) {
        int normalized = rotation % 360;
        if (normalized < 0) {
            normalized += 360;
        }
        // /Rotate must be a multiple of 90; treat anything else as unrotated.
        return normalized % 90 == 0 ? normalized : 0;
    }

    /**
     * Maps a fractional rectangle (top-left origin) from the displayed space of a page rotated
     * clockwise by {@code rotation} degrees back into the un-rotated page space.
     */
    static float[] displayedToUnrotated(int rotation, float x, float y, float w, float h) {
        return switch (rotation) {
            case 90 -> new float[] {y, 1f - x - w, h, w};
            case 180 -> new float[] {1f - x - w, 1f - y - h, w, h};
            case 270 -> new float[] {1f - y - h, x, h, w};
            default -> new float[] {x, y, w, h};
        };
    }

    /**
     * Maps a fractional rectangle (top-left origin) from the un-rotated page space into the
     * displayed space of a page rotated clockwise by {@code rotation} degrees.
     */
    static float[] unrotatedToDisplayed(int rotation, float x, float y, float w, float h) {
        return switch (rotation) {
            case 90 -> new float[] {1f - y - h, x, h, w};
            case 180 -> new float[] {1f - x - w, 1f - y - h, w, h};
            case 270 -> new float[] {y, 1f - x - w, h, w};
            default -> new float[] {x, y, w, h};
        };
    }

    private static void requirePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ExceptionUtils.createIllegalArgumentException(
                    "error.fileFormatRequired", "{0} must be in PDF format", "file");
        }
    }
}
