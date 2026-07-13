import { BaseParameters } from "@app/types/parameters";
import {
  useBaseParameters,
  type BaseParametersHook,
} from "@app/hooks/tools/shared/useBaseParameters";

/** Bottom-row positions (7=bottom-left, 8=bottom-centre, 9=bottom-right). */
export type BatesPosition = 7 | 8 | 9;

export interface BatesNumberingParameters extends BaseParameters {
  prefix: string;
  suffix: string;
  startingNumber: number;
  /** Number of digits to zero-pad the sequence to, e.g. 6 → 000123. */
  padWidth: number;
  position: BatesPosition;
  fontSize: number;
}

export const defaultParameters: BatesNumberingParameters = {
  prefix: "",
  suffix: "",
  startingNumber: 1,
  padWidth: 6,
  position: 9,
  fontSize: 10,
};

export type BatesNumberingParametersHook =
  BaseParametersHook<BatesNumberingParameters>;

export const useBatesNumberingParameters = (): BatesNumberingParametersHook =>
  useBaseParameters<BatesNumberingParameters>({
    defaultParameters,
    endpointName: "add-page-numbers",
    validateFn: (params): boolean =>
      params.startingNumber > 0 && params.padWidth >= 0 && params.fontSize > 0,
  });
