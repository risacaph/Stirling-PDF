import {
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  BatesNumberingParameters,
  BatesPosition,
} from "@app/components/tools/batesNumbering/useBatesNumberingParameters";

interface BatesNumberingSettingsProps {
  parameters: BatesNumberingParameters;
  onParameterChange: <K extends keyof BatesNumberingParameters>(
    key: K,
    value: BatesNumberingParameters[K],
  ) => void;
  disabled?: boolean;
}

const formatSample = (parameters: BatesNumberingParameters): string => {
  const sequence =
    parameters.padWidth > 0
      ? String(parameters.startingNumber).padStart(parameters.padWidth, "0")
      : String(parameters.startingNumber);
  return `${parameters.prefix}${sequence}${parameters.suffix}`;
};

const BatesNumberingSettings = ({
  parameters,
  onParameterChange,
  disabled = false,
}: BatesNumberingSettingsProps) => {
  const { t } = useTranslation();

  const positionOptions: { value: string; label: string }[] = [
    {
      value: "7",
      label: t("batesNumbering.settings.position.bottomLeft", "Bottom left"),
    },
    {
      value: "8",
      label: t(
        "batesNumbering.settings.position.bottomCenter",
        "Bottom centre",
      ),
    },
    {
      value: "9",
      label: t("batesNumbering.settings.position.bottomRight", "Bottom right"),
    },
  ];

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t(
          "batesNumbering.settings.note",
          "Stamp a unique sequential identifier on every page, as used for legal discovery and exhibits.",
        )}
      </Text>

      <Group grow>
        <TextInput
          label={t("batesNumbering.settings.prefix", "Prefix")}
          placeholder="ABC-"
          value={parameters.prefix}
          onChange={(event) =>
            onParameterChange("prefix", event.currentTarget.value)
          }
          disabled={disabled}
        />
        <TextInput
          label={t("batesNumbering.settings.suffix", "Suffix")}
          value={parameters.suffix}
          onChange={(event) =>
            onParameterChange("suffix", event.currentTarget.value)
          }
          disabled={disabled}
        />
      </Group>

      <Group grow>
        <NumberInput
          label={t("batesNumbering.settings.startingNumber", "Start at")}
          min={1}
          value={parameters.startingNumber}
          onChange={(value) =>
            onParameterChange(
              "startingNumber",
              typeof value === "number" ? value : 1,
            )
          }
          disabled={disabled}
        />
        <NumberInput
          label={t("batesNumbering.settings.padWidth", "Digits")}
          description={t(
            "batesNumbering.settings.padWidthDescription",
            "Zero-pad the number to this many digits.",
          )}
          min={0}
          max={12}
          value={parameters.padWidth}
          onChange={(value) =>
            onParameterChange("padWidth", typeof value === "number" ? value : 0)
          }
          disabled={disabled}
        />
      </Group>

      <Group grow>
        <Select
          label={t("batesNumbering.settings.positionLabel", "Position")}
          data={positionOptions}
          value={String(parameters.position)}
          allowDeselect={false}
          onChange={(value) =>
            onParameterChange(
              "position",
              value ? (Number(value) as BatesPosition) : 9,
            )
          }
          disabled={disabled}
        />
        <NumberInput
          label={t("batesNumbering.settings.fontSize", "Font size")}
          min={1}
          max={72}
          value={parameters.fontSize}
          onChange={(value) =>
            onParameterChange(
              "fontSize",
              typeof value === "number" ? value : 10,
            )
          }
          disabled={disabled}
        />
      </Group>

      <Text size="sm">
        {t("batesNumbering.settings.preview", "Preview")}:{" "}
        <Text span fw={600} ff="monospace">
          {formatSample(parameters)}
        </Text>
      </Text>
    </Stack>
  );
};

export default BatesNumberingSettings;
