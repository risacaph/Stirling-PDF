import { NumberInput, Select, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  BlankPageSize,
  InsertBlankPagesParameters,
} from "@app/hooks/tools/insertBlankPages/useInsertBlankPagesParameters";

interface InsertBlankPagesSettingsProps {
  parameters: InsertBlankPagesParameters;
  onParameterChange: <K extends keyof InsertBlankPagesParameters>(
    key: K,
    value: InsertBlankPagesParameters[K],
  ) => void;
  disabled?: boolean;
}

const InsertBlankPagesSettings = ({
  parameters,
  onParameterChange,
  disabled = false,
}: InsertBlankPagesSettingsProps) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t(
          "insertBlankPages.settings.note",
          "Insert one or more blank pages at a chosen position in the document.",
        )}
      </Text>

      <NumberInput
        label={t("insertBlankPages.settings.position", "Insert after page")}
        description={t(
          "insertBlankPages.settings.positionHint",
          "Use 0 to insert before the first page.",
        )}
        min={0}
        value={parameters.position}
        onChange={(value) =>
          onParameterChange(
            "position",
            typeof value === "number" ? value : Number(value) || 0,
          )
        }
        disabled={disabled}
      />

      <NumberInput
        label={t("insertBlankPages.settings.count", "Number of pages")}
        min={1}
        max={1000}
        value={parameters.count}
        onChange={(value) =>
          onParameterChange(
            "count",
            typeof value === "number" ? value : Number(value) || 1,
          )
        }
        disabled={disabled}
      />

      <Select
        label={t("insertBlankPages.settings.pageSize", "Page size")}
        data={[
          {
            value: "MATCH",
            label: t("insertBlankPages.settings.sizeMatch", "Match document"),
          },
          { value: "A4", label: "A4" },
          { value: "LETTER", label: "Letter" },
          { value: "LEGAL", label: "Legal" },
        ]}
        value={parameters.pageSize}
        allowDeselect={false}
        onChange={(value) =>
          onParameterChange("pageSize", (value as BlankPageSize) ?? "MATCH")
        }
        disabled={disabled}
      />
    </Stack>
  );
};

export default InsertBlankPagesSettings;
