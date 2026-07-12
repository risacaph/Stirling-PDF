import { BaseParameters } from "@app/types/parameters";
import {
  useBaseParameters,
  BaseParametersHook,
} from "@app/hooks/tools/shared/useBaseParameters";

export type ScanQuality = "low" | "medium" | "high";
export type ScanRotation = "none" | "slight" | "moderate" | "severe";
export type ScanColorspace = "grayscale" | "color";

export interface ScannerEffectParameters extends BaseParameters {
  quality: ScanQuality;
  rotation: ScanRotation;
  colorspace: ScanColorspace;
  yellowish: boolean;
}

export const defaultParameters: ScannerEffectParameters = {
  quality: "high",
  rotation: "slight",
  colorspace: "grayscale",
  yellowish: false,
};

const QUALITIES: ReadonlySet<string> = new Set<ScanQuality>([
  "low",
  "medium",
  "high",
]);
const ROTATIONS: ReadonlySet<string> = new Set<ScanRotation>([
  "none",
  "slight",
  "moderate",
  "severe",
]);

export type ScannerEffectParametersHook =
  BaseParametersHook<ScannerEffectParameters>;

export const useScannerEffectParameters = (): ScannerEffectParametersHook => {
  return useBaseParameters({
    defaultParameters,
    endpointName: "scanner-effect",
    validateFn: (params) =>
      QUALITIES.has(params.quality) && ROTATIONS.has(params.rotation),
  });
};
