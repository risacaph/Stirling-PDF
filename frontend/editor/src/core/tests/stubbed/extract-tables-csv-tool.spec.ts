import { test, expect } from "@app/tests/helpers/stub-test-base";
import { uploadFiles } from "@app/tests/helpers/ui-helpers";
import path from "path";

const SAMPLE_PDF = path.join(
  import.meta.dirname,
  "../test-fixtures/sample.pdf",
);

/**
 * Extract Tables to CSV has a single settings step (page selection) that
 * defaults to "all", so the run button should be disabled until a PDF is
 * uploaded and then enable immediately (parameters are valid by default).
 */
test.describe("Extract Tables to CSV tool — config validation", () => {
  test("run button stays disabled until a PDF is uploaded", async ({
    page,
  }) => {
    await page.goto("/extract-tables-csv");
    await page.waitForLoadState("domcontentloaded");

    const runBtn = page.locator('[data-tour="run-button"]');
    await expect(runBtn).toBeVisible({ timeout: 5_000 });
    await expect(runBtn).toBeDisabled();

    await uploadFiles(page, SAMPLE_PDF);

    // After upload the run button should enable (default page selection is valid)
    await expect(runBtn).toBeEnabled({ timeout: 5_000 });
  });
});
