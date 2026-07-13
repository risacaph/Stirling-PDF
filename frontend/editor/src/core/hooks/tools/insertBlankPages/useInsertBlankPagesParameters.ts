import { BaseParameters } from "@app/types/parameters";
import {
  useBaseParameters,
  type BaseParametersHook,
} from "@app/hooks/tools/shared/useBaseParameters";

export type BlankPageSize = "MATCH" | "A4" | "LETTER" | "LEGAL";

export interface InsertBlankPagesParameters extends BaseParameters {
  /** Insert the blank page(s) after this page number (1-based); 0 = before the first page. */
  position: number;
  /** Number of blank pages to insert. */
  count: number;
  /** Size of the inserted page(s). */
  pageSize: BlankPageSize;
}

export const defaultParameters: InsertBlankPagesParameters = {
  position: 0,
  count: 1,
  pageSize: "MATCH",
};

export type InsertBlankPagesParametersHook =
  BaseParametersHook<InsertBlankPagesParameters>;

export const useInsertBlankPagesParameters =
  (): InsertBlankPagesParametersHook =>
    useBaseParameters<InsertBlankPagesParameters>({
      defaultParameters,
      // Standard general endpoint; not gated by app config.
      endpointName: "",
      validateFn: (params): boolean =>
        Number.isFinite(params.position) &&
        params.position >= 0 &&
        Number.isInteger(params.count) &&
        params.count >= 1,
    });
