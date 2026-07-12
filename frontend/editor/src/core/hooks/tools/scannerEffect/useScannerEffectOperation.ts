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
  ScannerEffectParameters,
  defaultParameters,
} from "@app/hooks/tools/scannerEffect/useScannerEffectParameters";

const ENDPOINT = "/api/v1/misc/scanner-effect" satisfies ToolEndpoint;
type ScannerEffectApiParams = ToolApiParams[typeof ENDPOINT];

export const scannerEffectToApiParams = (
  parameters: ScannerEffectParameters,
): ScannerEffectApiParams => ({
  quality: parameters.quality,
  rotation: parameters.rotation,
  colorspace: parameters.colorspace,
  yellowish: parameters.yellowish,
  // Quality drives the blur/noise/brightness presets server-side; advanced
  // per-value tuning is intentionally not exposed in this tool.
  advancedEnabled: false,
});

export const scannerEffectFromApiParams = (
  apiParams: ScannerEffectApiParams,
): Partial<ScannerEffectParameters> => {
  const result: Partial<ScannerEffectParameters> = {};
  if (apiParams.quality !== undefined) {
    result.quality = apiParams.quality;
  }
  if (apiParams.rotation !== undefined) {
    result.rotation = apiParams.rotation;
  }
  if (apiParams.colorspace !== undefined) {
    result.colorspace = apiParams.colorspace;
  }
  if (apiParams.yellowish !== undefined) {
    result.yellowish = apiParams.yellowish;
  }
  return result;
};

export const buildScannerEffectFormData = (
  parameters: ScannerEffectParameters,
  file: File,
): FormData =>
  objectToFormData(scannerEffectToApiParams(parameters), { fileInput: file });

export const scannerEffectOperationConfig = defineSingleFileTool({
  buildFormData: buildScannerEffectFormData,
  toApiParams: scannerEffectToApiParams,
  fromApiParams: scannerEffectFromApiParams,
  operationType: "scannerEffect",
  endpoint: ENDPOINT,
  defaultParameters,
});

export const useScannerEffectOperation = () => {
  const { t } = useTranslation();

  return useToolOperation<ScannerEffectParameters>({
    ...scannerEffectOperationConfig,
    getErrorMessage: createStandardErrorHandler(
      t(
        "scannerEffect.error.failed",
        "An error occurred while applying the scanner effect.",
      ),
    ),
  });
};
