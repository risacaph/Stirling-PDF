import { BaseParameters } from "@app/types/parameters";
import {
  useBaseParameters,
  type BaseParametersHook,
} from "@app/hooks/tools/shared/useBaseParameters";

export interface TranslateParameters extends BaseParameters {
  /** Target language name (English name, e.g. "Spanish"), sent verbatim to the engine. */
  targetLanguage: string;
}

export const defaultParameters: TranslateParameters = {
  targetLanguage: "Spanish",
};

export type TranslateParametersHook = BaseParametersHook<TranslateParameters>;

export const useTranslateParameters = (): TranslateParametersHook =>
  useBaseParameters<TranslateParameters>({
    defaultParameters,
    // Not a config-gated backend endpoint; the AI-disabled case surfaces via the
    // request error handler rather than the endpoint-enabled gate.
    endpointName: "",
    validateFn: (params): boolean => params.targetLanguage.trim().length > 0,
  });
