import { useTranslation } from "react-i18next";
import {
  defineCustomTool,
  useToolOperation,
  type CustomProcessorResult,
} from "@app/hooks/tools/shared/useToolOperation";
import { createStandardErrorHandler } from "@app/utils/toolErrorHandler";
import {
  addNewPage,
  closeRawDocument,
  getRawPageCount,
  getRawPageSize,
  openRawDocumentSafe,
  saveRawDocument,
} from "@app/services/pdfiumService";
import {
  BlankPageSize,
  InsertBlankPagesParameters,
  defaultParameters,
} from "@app/hooks/tools/insertBlankPages/useInsertBlankPagesParameters";

// Page sizes in PDF points (72 dpi).
const PAGE_SIZES: Record<Exclude<BlankPageSize, "MATCH">, [number, number]> = {
  A4: [595.276, 841.89],
  LETTER: [612, 792],
  LEGAL: [612, 1008],
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

const resolveSize = async (
  docPtr: number,
  pageSize: BlankPageSize,
  totalPages: number,
  insertAt: number,
): Promise<[number, number]> => {
  if (pageSize !== "MATCH") {
    return PAGE_SIZES[pageSize];
  }
  if (totalPages === 0) {
    return PAGE_SIZES.A4;
  }
  // Match the neighbouring page: the one just before the insertion point, or the
  // first page when inserting at the very start.
  const referenceIndex = clamp(
    insertAt > 0 ? insertAt - 1 : 0,
    0,
    totalPages - 1,
  );
  const { width, height } = await getRawPageSize(docPtr, referenceIndex);
  return [width, height];
};

// Insert blank pages entirely client-side via PDFium, so the tool works offline
// and needs no backend endpoint.
export const insertBlankPagesOperationConfig = defineCustomTool({
  operationType: "insertBlankPages",
  customProcessor: async (
    parameters: InsertBlankPagesParameters,
    files: File[],
  ): Promise<CustomProcessorResult> => {
    const outputs: File[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const docPtr = await openRawDocumentSafe(buffer);
      try {
        const totalPages = await getRawPageCount(docPtr);
        const insertAt = clamp(parameters.position, 0, totalPages);
        const count = clamp(Math.round(parameters.count), 1, 1000);
        const [width, height] = await resolveSize(
          docPtr,
          parameters.pageSize,
          totalPages,
          insertAt,
        );

        for (let i = 0; i < count; i++) {
          await addNewPage(docPtr, insertAt + i, width, height);
        }

        const outBuffer = await saveRawDocument(docPtr);
        const base = (file.name || "document.pdf").replace(/\.[^.]+$/, "");
        outputs.push(
          new File([outBuffer], `${base}_inserted_pages.pdf`, {
            type: "application/pdf",
          }),
        );
      } finally {
        await closeRawDocument(docPtr);
      }
    }
    return { files: outputs, consumedAllInputs: true };
  },
  defaultParameters,
});

export const useInsertBlankPagesOperation = () => {
  const { t } = useTranslation();
  return useToolOperation<InsertBlankPagesParameters>({
    ...insertBlankPagesOperationConfig,
    getErrorMessage: createStandardErrorHandler(
      t(
        "insertBlankPages.error.failed",
        "An error occurred while inserting blank pages.",
      ),
    ),
  });
};
