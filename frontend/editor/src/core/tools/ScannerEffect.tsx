import { useTranslation } from "react-i18next";
import { createToolFlow } from "@app/components/tools/shared/createToolFlow";
import ScannerEffectSettings from "@app/components/tools/scannerEffect/ScannerEffectSettings";
import { useScannerEffectParameters } from "@app/hooks/tools/scannerEffect/useScannerEffectParameters";
import { useScannerEffectOperation } from "@app/hooks/tools/scannerEffect/useScannerEffectOperation";
import { useBaseTool } from "@app/hooks/tools/shared/useBaseTool";
import { BaseToolProps, ToolComponent } from "@app/types/tool";

const ScannerEffect = (props: BaseToolProps) => {
  const { t } = useTranslation();

  const base = useBaseTool(
    "scannerEffect",
    useScannerEffectParameters,
    useScannerEffectOperation,
    props,
  );

  return createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
    },
    steps: [
      {
        title: t("scannerEffect.labels.settings", "Settings"),
        isCollapsed: base.settingsCollapsed,
        onCollapsedClick: base.settingsCollapsed
          ? base.handleSettingsReset
          : undefined,
        content: (
          <ScannerEffectSettings
            parameters={base.params.parameters}
            onParameterChange={base.params.updateParameter}
            disabled={base.endpointLoading}
          />
        ),
      },
    ],
    executeButton: {
      text: t("scannerEffect.submit", "Apply scanner effect"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: base.handleExecute,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("scannerEffect.title", "Scanner Effect"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

export default ScannerEffect as ToolComponent;
