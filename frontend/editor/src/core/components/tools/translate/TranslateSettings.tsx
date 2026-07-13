import { Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { TranslateParameters } from "@app/hooks/tools/translate/useTranslateParameters";

const LANGUAGES: string[] = [
  "Arabic",
  "Chinese (Simplified)",
  "Dutch",
  "English",
  "French",
  "German",
  "Hindi",
  "Italian",
  "Japanese",
  "Korean",
  "Polish",
  "Portuguese",
  "Russian",
  "Spanish",
  "Turkish",
  "Ukrainian",
];

interface TranslateSettingsProps {
  parameters: TranslateParameters;
  onParameterChange: <K extends keyof TranslateParameters>(
    key: K,
    value: TranslateParameters[K],
  ) => void;
  disabled?: boolean;
}

const TranslateSettings = ({
  parameters,
  onParameterChange,
  disabled = false,
}: TranslateSettingsProps) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t(
          "translate.settings.note",
          "Extracts the document's text and translates it into the chosen language using AI. The result is provided as a text file.",
        )}
      </Text>

      <Select
        label={t("translate.settings.targetLanguage", "Translate into")}
        data={LANGUAGES}
        value={parameters.targetLanguage}
        allowDeselect={false}
        searchable
        onChange={(value) =>
          onParameterChange("targetLanguage", value ?? "Spanish")
        }
        disabled={disabled}
      />
    </Stack>
  );
};

export default TranslateSettings;
