import { Stack, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ExtractTablesCsvParameters } from "@app/hooks/tools/extractTablesCsv/useExtractTablesCsvParameters";

interface ExtractTablesCsvSettingsProps {
  parameters: ExtractTablesCsvParameters;
  onParameterChange: <K extends keyof ExtractTablesCsvParameters>(
    key: K,
    value: ExtractTablesCsvParameters[K],
  ) => void;
  disabled?: boolean;
}

const ExtractTablesCsvSettings = ({
  parameters,
  onParameterChange,
  disabled = false,
}: ExtractTablesCsvSettingsProps) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t(
          "extractTablesCsv.settings.note",
          "Detects tabular data on the selected pages and exports it as CSV. A single table downloads as one CSV file; multiple tables download as a ZIP of CSV files.",
        )}
      </Text>

      <TextInput
        label={t("extractTablesCsv.settings.pageNumbersLabel", "Pages")}
        description={t(
          "extractTablesCsv.settings.pageNumbersDescription",
          "Which pages to scan for tables. Use 'all', a list, or ranges (e.g. 1,3,5-9).",
        )}
        value={parameters.pageNumbers}
        onChange={(event) =>
          onParameterChange("pageNumbers", event.currentTarget.value)
        }
        disabled={disabled}
        placeholder="all"
      />
    </Stack>
  );
};

export default ExtractTablesCsvSettings;
