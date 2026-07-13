import { BaseParameters } from "@app/types/parameters";
import {
  useBaseParameters,
  type BaseParametersHook,
} from "@app/hooks/tools/shared/useBaseParameters";

/** Field types the backend can create from a definition (see FormFieldTypeSupport). */
export type FormBuilderFieldKind = "text" | "checkbox" | "combobox" | "listbox";

/**
 * A single field to place on the PDF. Geometry (x, y, width, height) is stored as fractions
 * (0-1) of the page, measured from the top-left corner — the same space the placement canvas
 * works in and the backend's /add-fields endpoint expects.
 */
export interface FormBuilderField {
  id: string;
  kind: FormBuilderFieldKind;
  name: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
  /** Choice options for combobox/listbox fields. */
  options?: string[];
}

export interface FormBuilderParameters extends BaseParameters {
  fields: FormBuilderField[];
}

export const defaultParameters: FormBuilderParameters = {
  fields: [],
};

export type FormBuilderParametersHook =
  BaseParametersHook<FormBuilderParameters>;

export const useFormBuilderParameters = (): FormBuilderParametersHook =>
  useBaseParameters<FormBuilderParameters>({
    defaultParameters,
    // Not a config-gated backend endpoint; the form controller is always available.
    endpointName: "",
    validateFn: (params): boolean =>
      params.fields.length > 0 &&
      params.fields.every((field) => field.name.trim().length > 0),
  });
