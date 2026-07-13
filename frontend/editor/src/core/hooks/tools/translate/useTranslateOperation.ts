import apiClient from "@app/services/apiClient";
import { useTranslation } from "react-i18next";
import {
  defineCustomTool,
  useToolOperation,
  type CustomProcessorResult,
} from "@app/hooks/tools/shared/useToolOperation";
import { createStandardErrorHandler } from "@app/utils/toolErrorHandler";
import {
  TranslateParameters,
  defaultParameters,
} from "@app/hooks/tools/translate/useTranslateParameters";

interface TranslateApiResult {
  translatedText?: string;
  sourceLanguage?: string;
}

// The AI engine returns the translated text as JSON; we wrap it in a .txt file so the result flows
// through the standard tool output/download path (rather than a bespoke text panel).
export const translateOperationConfig = defineCustomTool({
  operationType: "translate",
  customProcessor: async (
    parameters: TranslateParameters,
    files: File[],
  ): Promise<CustomProcessorResult> => {
    const outputs: File[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("fileInput", file);
      formData.append("targetLanguage", parameters.targetLanguage.trim());

      const response = await apiClient.post<TranslateApiResult>(
        "/api/v1/ai/tools/translate",
        formData,
      );

      const translated = response.data?.translatedText ?? "";
      const base = (file.name || "document.pdf").replace(/\.[^.]+$/, "");
      const langSlug = parameters.targetLanguage
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
      const outName = `${base}_${langSlug || "translated"}.txt`;
      outputs.push(new File([translated], outName, { type: "text/plain" }));
    }
    return { files: outputs, consumedAllInputs: false };
  },
  defaultParameters,
});

export const useTranslateOperation = () => {
  const { t } = useTranslation();
  return useToolOperation<TranslateParameters>({
    ...translateOperationConfig,
    getErrorMessage: createStandardErrorHandler(
      t(
        "translate.error.failed",
        "An error occurred while translating the document. Make sure the AI engine is enabled and configured.",
      ),
    ),
  });
};
