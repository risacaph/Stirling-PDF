import { Stack, Text, Select, Switch } from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  ScannerEffectParameters,
  ScanQuality,
  ScanRotation,
  ScanColorspace,
} from "@app/hooks/tools/scannerEffect/useScannerEffectParameters";

interface ScannerEffectSettingsProps {
  parameters: ScannerEffectParameters;
  onParameterChange: <K extends keyof ScannerEffectParameters>(
    key: K,
    value: ScannerEffectParameters[K],
  ) => void;
  disabled?: boolean;
}

const ScannerEffectSettings = ({
  parameters,
  onParameterChange,
  disabled = false,
}: ScannerEffectSettingsProps) => {
  const { t } = useTranslation();

  const qualityOptions: { value: ScanQuality; label: string }[] = [
    { value: "low", label: t("scannerEffect.settings.quality.low", "Low") },
    {
      value: "medium",
      label: t("scannerEffect.settings.quality.medium", "Medium"),
    },
    { value: "high", label: t("scannerEffect.settings.quality.high", "High") },
  ];

  const rotationOptions: { value: ScanRotation; label: string }[] = [
    { value: "none", label: t("scannerEffect.settings.rotation.none", "None") },
    {
      value: "slight",
      label: t("scannerEffect.settings.rotation.slight", "Slight"),
    },
    {
      value: "moderate",
      label: t("scannerEffect.settings.rotation.moderate", "Moderate"),
    },
    {
      value: "severe",
      label: t("scannerEffect.settings.rotation.severe", "Severe"),
    },
  ];

  const colorspaceOptions: { value: ScanColorspace; label: string }[] = [
    {
      value: "grayscale",
      label: t("scannerEffect.settings.colorspace.grayscale", "Grayscale"),
    },
    {
      value: "color",
      label: t("scannerEffect.settings.colorspace.color", "Colour"),
    },
  ];

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t(
          "scannerEffect.settings.note",
          "Rasterises each page and adds subtle skew, blur and noise so the PDF looks scanned or photocopied.",
        )}
      </Text>

      <Select
        label={t("scannerEffect.settings.qualityLabel", "Scan quality")}
        description={t(
          "scannerEffect.settings.qualityDescription",
          "Higher quality keeps the page cleaner; lower quality adds more scan artefacts.",
        )}
        data={qualityOptions}
        value={parameters.quality}
        allowDeselect={false}
        onChange={(value) =>
          onParameterChange("quality", (value as ScanQuality) ?? "high")
        }
        disabled={disabled}
      />

      <Select
        label={t("scannerEffect.settings.rotationLabel", "Rotation")}
        description={t(
          "scannerEffect.settings.rotationDescription",
          "How much random page skew to apply.",
        )}
        data={rotationOptions}
        value={parameters.rotation}
        allowDeselect={false}
        onChange={(value) =>
          onParameterChange("rotation", (value as ScanRotation) ?? "slight")
        }
        disabled={disabled}
      />

      <Select
        label={t("scannerEffect.settings.colorspaceLabel", "Colour")}
        data={colorspaceOptions}
        value={parameters.colorspace}
        allowDeselect={false}
        onChange={(value) =>
          onParameterChange(
            "colorspace",
            (value as ScanColorspace) ?? "grayscale",
          )
        }
        disabled={disabled}
      />

      <Switch
        label={t("scannerEffect.settings.yellowishLabel", "Yellowed paper")}
        description={t(
          "scannerEffect.settings.yellowishDescription",
          "Tint the page to mimic aged or photocopied paper.",
        )}
        checked={parameters.yellowish}
        onChange={(event) =>
          onParameterChange("yellowish", event.currentTarget.checked)
        }
        disabled={disabled}
      />
    </Stack>
  );
};

export default ScannerEffectSettings;
