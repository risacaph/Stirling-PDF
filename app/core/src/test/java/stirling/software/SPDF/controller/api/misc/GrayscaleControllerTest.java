package stirling.software.SPDF.controller.api.misc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import stirling.software.SPDF.model.api.misc.GrayscaleRequest;
import stirling.software.SPDF.service.misc.GrayscaleService;
import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.util.TempFile;
import stirling.software.common.util.TempFileManager;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("GrayscaleController Tests")
class GrayscaleControllerTest {

    @Mock private CustomPDFDocumentFactory pdfDocumentFactory;
    @Mock private TempFileManager tempFileManager;

    private GrayscaleController controller;

    @BeforeEach
    void setUp() throws IOException {
        controller =
                new GrayscaleController(new GrayscaleService(pdfDocumentFactory), tempFileManager);

        // Real temp file backing so WebResponseUtils.pdfDocToWebResponse can save the output.
        lenient()
                .when(tempFileManager.createManagedTempFile(anyString()))
                .thenAnswer(
                        inv -> {
                            File f =
                                    Files.createTempFile(
                                                    "grayscale_test", inv.<String>getArgument(0))
                                            .toFile();
                            f.deleteOnExit();
                            TempFile tf = mock(TempFile.class);
                            lenient().when(tf.getFile()).thenReturn(f);
                            lenient().when(tf.getPath()).thenReturn(f.toPath());
                            return tf;
                        });
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private static MockMultipartFile pdfFile(String filename, int pageCount, PDRectangle pageSize)
            throws IOException {
        try (PDDocument doc = new PDDocument()) {
            for (int i = 0; i < pageCount; i++) {
                doc.addPage(new PDPage(pageSize));
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            return new MockMultipartFile(
                    "fileInput", filename, "application/pdf", baos.toByteArray());
        }
    }

    /** Stub the factory to return fresh real documents loaded from the multipart bytes. */
    private void stubFactoryLoad() throws IOException {
        lenient()
                .when(pdfDocumentFactory.load(any(MultipartFile.class)))
                .thenAnswer(inv -> Loader.loadPDF(((MultipartFile) inv.getArgument(0)).getBytes()));
    }

    private static GrayscaleRequest request(MockMultipartFile file, Integer dpi) {
        GrayscaleRequest req = new GrayscaleRequest();
        req.setFileInput(file);
        req.setDpi(dpi);
        return req;
    }

    private static byte[] drain(ResponseEntity<Resource> response) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (InputStream in = response.getBody().getInputStream()) {
            in.transferTo(baos);
        }
        return baos.toByteArray();
    }

    private static org.assertj.core.data.Offset<Float> within(float tol) {
        return org.assertj.core.data.Offset.offset(tol);
    }

    // ---------------------------------------------------------------------
    // End-to-end controller behaviour (real rendering, mocked boundaries)
    // ---------------------------------------------------------------------

    @Test
    @DisplayName("produces a valid single-page grayscale PDF for a one-page input")
    void singlePageHappyPath() throws Exception {
        MockMultipartFile file = pdfFile("input.pdf", 1, PDRectangle.A6);
        stubFactoryLoad();

        ResponseEntity<Resource> response = controller.pdfToGrayscale(request(file, 72));

        assertThat(response).isNotNull();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        byte[] out = drain(response);
        assertThat(out).isNotEmpty();
        try (PDDocument result = Loader.loadPDF(out)) {
            assertThat(result.getNumberOfPages()).isEqualTo(1);
            PDRectangle box = result.getPage(0).getMediaBox();
            assertThat(box.getWidth()).isCloseTo(PDRectangle.A6.getWidth(), within(1f));
            assertThat(box.getHeight()).isCloseTo(PDRectangle.A6.getHeight(), within(1f));
        }
    }

    @Test
    @DisplayName("preserves page count for a multi-page input")
    void multiPageKeepsPageCount() throws Exception {
        MockMultipartFile file = pdfFile("multi.pdf", 3, PDRectangle.A6);
        stubFactoryLoad();

        ResponseEntity<Resource> response = controller.pdfToGrayscale(request(file, 72));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        try (PDDocument result = Loader.loadPDF(drain(response))) {
            assertThat(result.getNumberOfPages()).isEqualTo(3);
        }
    }

    @Test
    @DisplayName("defaults the DPI when none is supplied")
    void nullDpiUsesDefault() throws Exception {
        MockMultipartFile file = pdfFile("default.pdf", 1, PDRectangle.A6);
        stubFactoryLoad();

        ResponseEntity<Resource> response = controller.pdfToGrayscale(request(file, null));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        byte[] out = drain(response);
        assertThat(out).isNotEmpty();
        try (PDDocument result = Loader.loadPDF(out)) {
            assertThat(result.getNumberOfPages()).isEqualTo(1);
        }
    }

    @Test
    @DisplayName("propagates IOException from the document factory")
    void factoryIOExceptionPropagates() throws Exception {
        MockMultipartFile file = pdfFile("io.pdf", 1, PDRectangle.A6);
        lenient()
                .when(pdfDocumentFactory.load(any(MultipartFile.class)))
                .thenThrow(new IOException("boom-load"));

        assertThatThrownBy(() -> controller.pdfToGrayscale(request(file, 72)))
                .isInstanceOf(IOException.class);
    }
}
