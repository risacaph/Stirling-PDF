import {
  ColorInput,
  Divider,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  HeaderFooterMargin,
  HeadersFootersParameters,
} from "@app/hooks/tools/headersFooters/useHeadersFootersParameters";

interface HeadersFootersSettingsProps {
  parameters: HeadersFootersParameters;
  onParameterChange: <K extends keyof HeadersFootersParameters>(
    key: K,
    value: HeadersFootersParameters[K],
  ) => void;
  disabled?: boolean;
}

const HeadersFootersSettings = ({
  parameters,
  onParameterChange,
  disabled = false,
}: HeadersFootersSettingsProps) => {
  const { t } = useTranslation();

  type TextSlotKey =
    | "headerLeft"
    | "headerCenter"
    | "headerRight"
    | "footerLeft"
    | "footerCenter"
    | "footerRight";

  const textField = (key: TextSlotKey, label: string) => (
    <TextInput
      label={label}
      value={parameters[key]}
      onChange={(event) => onParameterChange(key, event.currentTarget.value)}
      disabled={disabled}
    />
  );

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t(
          "headersFooters.settings.note",
          "Add text to the top and bottom margins of every page. Leave a slot blank to skip it.",
        )}
      </Text>

      <Stack gap="xs">
        <Text size="sm" fw={600}>
          {t("headersFooters.settings.header", "Header (top)")}
        </Text>
        {textField("headerLeft", t("headersFooters.settings.left", "Left"))}
        {textField(
          "headerCenter",
          t("headersFooters.settings.center", "Center"),
        )}
        {textField("headerRight", t("headersFooters.settings.right", "Right"))}
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Text size="sm" fw={600}>
          {t("headersFooters.settings.footer", "Footer (bottom)")}
        </Text>
        {textField("footerLeft", t("headersFooters.settings.left", "Left"))}
        {textField(
          "footerCenter",
          t("headersFooters.settings.center", "Center"),
        )}
        {textField("footerRight", t("headersFooters.settings.right", "Right"))}
      </Stack>

      <Text size="xs" c="dimmed">
        {t(
          "headersFooters.settings.tokens",
          "Tokens: @page_number, @total_pages, @date, @time, @filename. Example: Page @page_number of @total_pages",
        )}
      </Text>

      <Divider />

      <SimpleGrid cols={2}>
        <NumberInput
          label={t("headersFooters.settings.fontSize", "Font size")}
          min={4}
          max={200}
          value={parameters.fontSize}
          onChange={(value) =>
            onParameterChange(
              "fontSize",
              typeof value === "number" ? value : Number(value) || 12,
            )
          }
          disabled={disabled}
        />
        <ColorInput
          label={t("headersFooters.settings.fontColor", "Text color")}
          format="hex"
          value={parameters.fontColor}
          onChange={(value) => onParameterChange("fontColor", value)}
          disabled={disabled}
        />
      </SimpleGrid>

      <Group grow align="flex-start">
        <Select
          label={t("headersFooters.settings.margin", "Margin")}
          data={[
            {
              value: "small",
              label: t("headersFooters.settings.marginSmall", "Small"),
            },
            {
              value: "medium",
              label: t("headersFooters.settings.marginMedium", "Medium"),
            },
            {
              value: "large",
              label: t("headersFooters.settings.marginLarge", "Large"),
            },
            {
              value: "x-large",
              label: t("headersFooters.settings.marginXLarge", "Extra large"),
            },
          ]}
          value={parameters.margin}
          allowDeselect={false}
          onChange={(value) =>
            onParameterChange(
              "margin",
              (value as HeaderFooterMargin) ?? "medium",
            )
          }
          disabled={disabled}
        />
        <TextInput
          label={t("headersFooters.settings.pages", "Pages")}
          description={t(
            "headersFooters.settings.pagesHint",
            'e.g. "all", "1,3,5" or "2-8"',
          )}
          value={parameters.pageNumbers}
          onChange={(event) =>
            onParameterChange("pageNumbers", event.currentTarget.value)
          }
          disabled={disabled}
        />
      </Group>
    </Stack>
  );
};

export default HeadersFootersSettings;
