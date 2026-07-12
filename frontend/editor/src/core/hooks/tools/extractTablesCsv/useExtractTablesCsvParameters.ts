import { BaseParameters } from "@app/types/parameters";
import {
  useBaseParameters,
  BaseParametersHook,
} from "@app/hooks/tools/shared/useBaseParameters";

export interface ExtractTablesCsvParameters extends BaseParameters {
  pageNumbers: string;
}

export const defaultParameters: ExtractTablesCsvParameters = {
  pageNumbers: "all",
};

export type ExtractTablesCsvParametersHook =
  BaseParametersHook<ExtractTablesCsvParameters>;

export const useExtractTablesCsvParameters =
  (): ExtractTablesCsvParametersHook => {
    return useBaseParameters({
      defaultParameters,
      endpointName: "pdf-to-csv",
      validateFn: (params) => params.pageNumbers.trim().length > 0,
    });
  };
