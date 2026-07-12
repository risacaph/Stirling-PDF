import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  useToolOperation,
  defineSingleFileTool,
} from "@app/hooks/tools/shared/useToolOperation";
import {
  objectToFormData,
  type ToolApiParams,
  type ToolEndpoint,
} from "@app/hooks/tools/shared/toolApiMapping";
import { createStandardErrorHandler } from "@app/utils/toolErrorHandler";
import {
  ExtractTablesCsvParameters,
  defaultParameters,
} from "@app/hooks/tools/extractTablesCsv/useExtractTablesCsvParameters";
import { useToolResources } from "@app/hooks/tools/shared/useToolResources";
import { zipFileService } from "@app/services/zipFileService";

const ENDPOINT = "/api/v1/convert/pdf/csv" satisfies ToolEndpoint;
type ExtractTablesCsvApiParams = ToolApiParams[typeof ENDPOINT];

export const extractTablesCsvToApiParams = (
  parameters: ExtractTablesCsvParameters,
): ExtractTablesCsvApiParams => ({
  pageNumbers: parameters.pageNumbers,
});

export const extractTablesCsvFromApiParams = (
  apiParams: ExtractTablesCsvApiParams,
): Partial<ExtractTablesCsvParameters> => {
  const result: Partial<ExtractTablesCsvParameters> = {};
  if (apiParams.pageNumbers !== undefined) {
    result.pageNumbers = apiParams.pageNumbers;
  }
  return result;
};

export const buildExtractTablesCsvFormData = (
  parameters: ExtractTablesCsvParameters,
  file: File,
): FormData =>
  objectToFormData(extractTablesCsvToApiParams(parameters), {
    fileInput: file,
  });

export const extractTablesCsvOperationConfig = defineSingleFileTool({
  buildFormData: buildExtractTablesCsvFormData,
  toApiParams: extractTablesCsvToApiParams,
  fromApiParams: extractTablesCsvFromApiParams,
  operationType: "extractTablesCsv",
  endpoint: ENDPOINT,
  defaultParameters,
});

const csvFileName = (originalName: string): string =>
  `${originalName.replace(/\.pdf$/i, "")}_tables.csv`;

export const useExtractTablesCsvOperation = () => {
  const { t } = useTranslation();
  const { extractZipFiles } = useToolResources();

  // The backend returns a single CSV when one table is found, or a ZIP of
  // CSV files when multiple tables/pages are extracted. Branch on the response
  // bytes so the single-table case downloads a usable .csv rather than an
  // octet-stream blob.
  const responseHandler = useCallback(
    async (blob: Blob, originalFiles: File[]): Promise<File[]> => {
      if (await zipFileService.isZipResponse(blob)) {
        return await extractZipFiles(blob);
      }
      const baseName = originalFiles[0]?.name ?? "document.pdf";
      return [new File([blob], csvFileName(baseName), { type: "text/csv" })];
    },
    [extractZipFiles],
  );

  return useToolOperation<ExtractTablesCsvParameters>({
    ...extractTablesCsvOperationConfig,
    responseHandler,
    getErrorMessage: createStandardErrorHandler(
      t(
        "extractTablesCsv.error.failed",
        "An error occurred while extracting tables. The PDF may not contain any detectable tables on the selected pages.",
      ),
    ),
  });
};
