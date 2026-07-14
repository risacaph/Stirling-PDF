package stirling.software.SPDF.controller.api.edit;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class EditLinksControllerTest {

    private static final float EPSILON = 1e-6f;

    @Test
    void normalizeRotation_handlesMultiplesAndInvalidValues() {
        assertEquals(0, EditLinksController.normalizeRotation(0));
        assertEquals(90, EditLinksController.normalizeRotation(90));
        assertEquals(180, EditLinksController.normalizeRotation(180));
        assertEquals(270, EditLinksController.normalizeRotation(270));
        assertEquals(0, EditLinksController.normalizeRotation(360));
        assertEquals(90, EditLinksController.normalizeRotation(450));
        assertEquals(270, EditLinksController.normalizeRotation(-90));
        // Not a multiple of 90 -> treated as unrotated.
        assertEquals(0, EditLinksController.normalizeRotation(45));
    }

    @Test
    void rotationTransforms_roundTripForAllRotations() {
        float[] rect = {0.12f, 0.34f, 0.25f, 0.08f};
        for (int rotation : new int[] {0, 90, 180, 270}) {
            float[] unrotated =
                    EditLinksController.displayedToUnrotated(
                            rotation, rect[0], rect[1], rect[2], rect[3]);
            float[] back =
                    EditLinksController.unrotatedToDisplayed(
                            rotation, unrotated[0], unrotated[1], unrotated[2], unrotated[3]);
            assertArrayEquals(rect, back, EPSILON, "round trip failed for rotation " + rotation);
        }
    }

    @Test
    void displayedToUnrotated_mapsCornersFor90DegreeRotation() {
        // A page rotated 90 degrees clockwise shows the un-rotated bottom-left corner at the
        // displayed top-left. A small box drawn at the displayed top-left must therefore map to
        // the un-rotated bottom-left, with width and height swapped.
        float[] unrotated = EditLinksController.displayedToUnrotated(90, 0f, 0f, 0.2f, 0.1f);
        assertArrayEquals(new float[] {0f, 0.8f, 0.1f, 0.2f}, unrotated, EPSILON);
    }

    @Test
    void displayedToUnrotated_mapsCornersFor270DegreeRotation() {
        // A page rotated 270 degrees clockwise shows the un-rotated top-right corner at the
        // displayed top-left.
        float[] unrotated = EditLinksController.displayedToUnrotated(270, 0f, 0f, 0.2f, 0.1f);
        assertArrayEquals(new float[] {0.9f, 0f, 0.1f, 0.2f}, unrotated, EPSILON);
    }

    @Test
    void displayedToUnrotated_invertsBothAxesFor180DegreeRotation() {
        float[] unrotated = EditLinksController.displayedToUnrotated(180, 0.1f, 0.2f, 0.3f, 0.4f);
        assertArrayEquals(new float[] {0.6f, 0.4f, 0.3f, 0.4f}, unrotated, EPSILON);
    }

    @Test
    void transforms_areIdentityWhenUnrotated() {
        float[] rect = {0.1f, 0.2f, 0.3f, 0.4f};
        assertArrayEquals(
                rect,
                EditLinksController.displayedToUnrotated(0, rect[0], rect[1], rect[2], rect[3]),
                EPSILON);
        assertArrayEquals(
                rect,
                EditLinksController.unrotatedToDisplayed(0, rect[0], rect[1], rect[2], rect[3]),
                EPSILON);
    }
}
