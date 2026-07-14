import { BaseParameters } from "@app/types/parameters";
import {
  useBaseParameters,
  type BaseParametersHook,
} from "@app/hooks/tools/shared/useBaseParameters";

export type HeaderFooterMargin = "small" | "medium" | "large" | "x-large";

/**
 * Text for the six header/footer slots. Each is optional; empty slots are skipped.
 * The text supports the same @-tokens the add-stamp endpoint understands
 * (e.g. @page_number, @total_pages, @date, @date{dd/MM/yyyy}, @filename).
 */
export interface HeadersFootersParameters extends BaseParameters {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  fontSize: number;
  fontColor: string;
  margin: HeaderFooterMargin;
  /** Which pages to stamp: "all", or a list/range such as "1,3,5" or "2-8". */
  pageNumbers: string;
}

export const defaultParameters: HeadersFootersParameters = {
  headerLeft: "",
  headerCenter: "",
  headerRight: "",
  footerLeft: "",
  footerCenter: "",
  footerRight: "",
  fontSize: 12,
  fontColor: "#000000",
  margin: "medium",
  pageNumbers: "all",
};

export type HeadersFootersParametersHook =
  BaseParametersHook<HeadersFootersParameters>;

const hasAnyText = (params: HeadersFootersParameters): boolean =>
  [
    params.headerLeft,
    params.headerCenter,
    params.headerRight,
    params.footerLeft,
    params.footerCenter,
    params.footerRight,
  ].some((text) => text.trim().length > 0);

export const useHeadersFootersParameters = (): HeadersFootersParametersHook =>
  useBaseParameters<HeadersFootersParameters>({
    defaultParameters,
    // Composes the always-available add-stamp endpoint.
    endpointName: "add-stamp",
    validateFn: (params): boolean => hasAnyText(params) && params.fontSize > 0,
  });
