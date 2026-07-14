import apiClient from "@app/services/apiClient";
import { useTranslation } from "react-i18next";
import {
  defineCustomTool,
  useToolOperation,
  type CustomProcessorResult,
} from "@app/hooks/tools/shared/useToolOperation";
import { createStandardErrorHandler } from "@app/utils/toolErrorHandler";
import {
  HeadersFootersParameters,
  defaultParameters,
} from "@app/hooks/tools/headersFooters/useHeadersFootersParameters";

// Each header/footer slot maps to a 1-9 grid position understood by /add-stamp.
// Per the backend's calculatePositionY, positions 1-3 render at the TOP of the page
// and 7-9 at the BOTTOM (the request schema's doc string is inverted; the AddStamp
// UI grid confirms this top-to-bottom layout).
interface StampSlot {
  position: number;
  text: string;
}

const slotsFor = (parameters: HeadersFootersParameters): StampSlot[] =>
  [
    { position: 1, text: parameters.headerLeft },
    { position: 2, text: parameters.headerCenter },
    { position: 3, text: parameters.headerRight },
    { position: 7, text: parameters.footerLeft },
    { position: 8, text: parameters.footerCenter },
    { position: 9, text: parameters.footerRight },
  ].filter((slot) => slot.text.trim().length > 0);

// Add headers and footers by chaining one text stamp per non-empty slot, feeding
// each stamped result into the next call so every slot lands on the same document.
export const headersFootersOperationConfig = defineCustomTool({
  operationType: "headersFooters",
  customProcessor: async (
    parameters: HeadersFootersParameters,
    files: File[],
  ): Promise<CustomProcessorResult> => {
    const color = parameters.fontColor.startsWith("#")
      ? parameters.fontColor
      : `#${parameters.fontColor}`;
    const pageNumbers = parameters.pageNumbers.trim() || "all";
    const slots = slotsFor(parameters);

    const outputs: File[] = [];
    for (const file of files) {
      const originalName = file.name || "document.pdf";
      let current: Blob = file;

      for (const slot of slots) {
        const formData = new FormData();
        formData.append(
          "fileInput",
          new File([current], originalName, { type: "application/pdf" }),
        );
        formData.append("stampType", "text");
        formData.append("stampText", slot.text);
        formData.append("position", String(slot.position));
        formData.append("fontSize", String(parameters.fontSize));
        formData.append("rotation", "0");
        formData.append("opacity", "1");
        formData.append("overrideX", "-1");
        formData.append("overrideY", "-1");
        formData.append("customMargin", parameters.margin);
        formData.append("customColor", color);
        formData.append("alphabet", "roman");
        formData.append("pageNumbers", pageNumbers);

        const response = await apiClient.post(
          "/api/v1/misc/add-stamp",
          formData,
          { responseType: "blob" },
        );
        current = response.data as Blob;
      }

      const base = originalName.replace(/\.[^.]+$/, "");
      outputs.push(
        new File([current], `${base}_headers_footers.pdf`, {
          type: "application/pdf",
        }),
      );
    }

    return { files: outputs, consumedAllInputs: true };
  },
  defaultParameters,
});

export const useHeadersFootersOperation = () => {
  const { t } = useTranslation();
  return useToolOperation<HeadersFootersParameters>({
    ...headersFootersOperationConfig,
    getErrorMessage: createStandardErrorHandler(
      t(
        "headersFooters.error.failed",
        "An error occurred while adding headers and footers.",
      ),
    ),
  });
};
