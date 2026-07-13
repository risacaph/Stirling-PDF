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
  BatesNumberingParameters,
  defaultParameters,
} from "@app/components/tools/batesNumbering/useBatesNumberingParameters";

// Bates numbering is a legal-friendly preset over the general add-page-numbers
// endpoint: the sequence number ({n}) is zero-padded and wrapped in a fixed
// prefix/suffix, and stamped in a page corner.
const ENDPOINT = "/api/v1/misc/add-page-numbers" satisfies ToolEndpoint;
type AddPageNumbersApiParams = ToolApiParams[typeof ENDPOINT];

export const buildBatesCustomText = (prefix: string, suffix: string): string =>
  `${prefix}{n}${suffix}`;

export const batesNumberingToApiParams = (
  parameters: BatesNumberingParameters,
): AddPageNumbersApiParams => ({
  customMargin: "medium",
  position: parameters.position,
  fontSize: parameters.fontSize,
  fontType: "helvetica",
  startingNumber: parameters.startingNumber,
  pagesToNumber: "all",
  customText: buildBatesCustomText(parameters.prefix, parameters.suffix),
  zeroPad: parameters.padWidth,
});

export const buildBatesNumberingFormData = (
  parameters: BatesNumberingParameters,
  file: File,
): FormData =>
  objectToFormData(batesNumberingToApiParams(parameters), { fileInput: file });

export const batesNumberingOperationConfig = defineSingleFileTool({
  buildFormData: buildBatesNumberingFormData,
  toApiParams: batesNumberingToApiParams,
  operationType: "batesNumbering",
  endpoint: ENDPOINT,
  defaultParameters,
});

export const useBatesNumberingOperation = () => {
  const { t } = useTranslation();

  return useToolOperation<BatesNumberingParameters>({
    ...batesNumberingOperationConfig,
    getErrorMessage: createStandardErrorHandler(
      t(
        "batesNumbering.error.failed",
        "An error occurred while applying Bates numbering.",
      ),
    ),
  });
};
