import { List, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { FormBuilderParameters } from "@app/hooks/tools/formBuilder/useFormBuilderParameters";

interface FormBuilderSettingsProps {
  parameters: FormBuilderParameters;
}

const FormBuilderSettings = ({ parameters }: FormBuilderSettingsProps) => {
  const { t } = useTranslation();

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {t(
          "formBuilder.settings.note",
          "Add fillable form fields to a PDF. Use the workspace to place, drag and resize fields on the page, then generate an interactive PDF.",
        )}
      </Text>
      <List size="xs" c="dimmed" spacing={2}>
        <List.Item>
          {t(
            "formBuilder.settings.step1",
            "Pick a field type in the workspace toolbar to drop it on the page.",
          )}
        </List.Item>
        <List.Item>
          {t(
            "formBuilder.settings.step2",
            "Drag to move, or drag the corner handle to resize.",
          )}
        </List.Item>
        <List.Item>
          {t(
            "formBuilder.settings.step3",
            "Edit the selected field's name and options on the right.",
          )}
        </List.Item>
      </List>
      <Text size="xs" c="dimmed">
        {t("formBuilder.settings.count", "{{count}} field(s) placed.", {
          count: parameters.fields.length,
        })}
      </Text>
    </Stack>
  );
};

export default FormBuilderSettings;
