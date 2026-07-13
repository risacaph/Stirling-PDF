import apiClient from "@app/services/apiClient";
import { useTranslation } from "react-i18next";
import {
  defineCustomTool,
  useToolOperation,
  type CustomProcessorResult,
} from "@app/hooks/tools/shared/useToolOperation";
import { createStandardErrorHandler } from "@app/utils/toolErrorHandler";
import {
  FormBuilderParameters,
  defaultParameters,
} from "@app/hooks/tools/formBuilder/useFormBuilderParameters";

// Shape sent to /api/v1/form/add-fields. Geometry is fractional (0-1), top-left origin;
// the backend converts it to PDF widget coordinates against each page's CropBox.
interface FieldDefinitionPayload {
  name: string;
  label: string;
  type: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
  options?: string[];
}

export const formBuilderOperationConfig = defineCustomTool({
  operationType: "formBuilder",
  customProcessor: async (
    parameters: FormBuilderParameters,
    files: File[],
  ): Promise<CustomProcessorResult> => {
    const outputs: File[] = [];
    for (const file of files) {
      const definitions: FieldDefinitionPayload[] = parameters.fields.map(
        (field) => ({
          name: field.name.trim(),
          label: field.name.trim(),
          type: field.kind,
          pageIndex: field.pageIndex,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          required: field.required ?? false,
          ...(field.options && field.options.length > 0
            ? { options: field.options }
            : {}),
        }),
      );

      const formData = new FormData();
      formData.append("file", file);
      formData.append("fields", JSON.stringify(definitions));

      const response = await apiClient.post(
        "/api/v1/form/add-fields",
        formData,
        {
          responseType: "blob",
        },
      );

      const base = (file.name || "document.pdf").replace(/\.[^.]+$/, "");
      const blob = response.data as Blob;
      outputs.push(
        new File([blob], `${base}_form.pdf`, { type: "application/pdf" }),
      );
    }
    return { files: outputs, consumedAllInputs: true };
  },
  defaultParameters,
});

export const useFormBuilderOperation = () => {
  const { t } = useTranslation();
  return useToolOperation<FormBuilderParameters>({
    ...formBuilderOperationConfig,
    getErrorMessage: createStandardErrorHandler(
      t(
        "formBuilder.error.failed",
        "An error occurred while adding the form fields.",
      ),
    ),
  });
};
