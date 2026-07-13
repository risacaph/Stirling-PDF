import { useTranslation } from "react-i18next";
import { createToolFlow } from "@app/components/tools/shared/createToolFlow";
import BatesNumberingSettings from "@app/components/tools/batesNumbering/BatesNumberingSettings";
import { useBatesNumberingParameters } from "@app/components/tools/batesNumbering/useBatesNumberingParameters";
import { useBatesNumberingOperation } from "@app/components/tools/batesNumbering/useBatesNumberingOperation";
import { useBaseTool } from "@app/hooks/tools/shared/useBaseTool";
import { BaseToolProps, ToolComponent } from "@app/types/tool";

const BatesNumbering = (props: BaseToolProps) => {
  const { t } = useTranslation();

  const base = useBaseTool(
    "batesNumbering",
    useBatesNumberingParameters,
    useBatesNumberingOperation,
    props,
  );

  return createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
    },
    steps: [
      {
        title: t("batesNumbering.labels.settings", "Settings"),
        isCollapsed: base.settingsCollapsed,
        onCollapsedClick: base.settingsCollapsed
          ? base.handleSettingsReset
          : undefined,
        content: (
          <BatesNumberingSettings
            parameters={base.params.parameters}
            onParameterChange={base.params.updateParameter}
            disabled={base.endpointLoading}
          />
        ),
      },
    ],
    executeButton: {
      text: t("batesNumbering.submit", "Apply Bates numbering"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: base.handleExecute,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("batesNumbering.title", "Bates Numbering"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

export default BatesNumbering as ToolComponent;
