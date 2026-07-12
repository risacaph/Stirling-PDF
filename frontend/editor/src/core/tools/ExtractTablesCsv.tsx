import { useTranslation } from "react-i18next";
import { createToolFlow } from "@app/components/tools/shared/createToolFlow";
import ExtractTablesCsvSettings from "@app/components/tools/extractTablesCsv/ExtractTablesCsvSettings";
import { useExtractTablesCsvParameters } from "@app/hooks/tools/extractTablesCsv/useExtractTablesCsvParameters";
import { useExtractTablesCsvOperation } from "@app/hooks/tools/extractTablesCsv/useExtractTablesCsvOperation";
import { useBaseTool } from "@app/hooks/tools/shared/useBaseTool";
import { BaseToolProps, ToolComponent } from "@app/types/tool";
import { useExtractTablesCsvTips } from "@app/components/tooltips/useExtractTablesCsvTips";

const ExtractTablesCsv = (props: BaseToolProps) => {
  const { t } = useTranslation();
  const extractTablesCsvTips = useExtractTablesCsvTips();

  const base = useBaseTool(
    "extractTablesCsv",
    useExtractTablesCsvParameters,
    useExtractTablesCsvOperation,
    props,
  );

  return createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
    },
    steps: [
      {
        title: t("extractTablesCsv.labels.settings", "Settings"),
        isCollapsed: base.settingsCollapsed,
        onCollapsedClick: base.settingsCollapsed
          ? base.handleSettingsReset
          : undefined,
        tooltip: extractTablesCsvTips,
        content: (
          <ExtractTablesCsvSettings
            parameters={base.params.parameters}
            onParameterChange={base.params.updateParameter}
            disabled={base.endpointLoading}
          />
        ),
      },
    ],
    executeButton: {
      text: t("extractTablesCsv.submit", "Extract tables to CSV"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: base.handleExecute,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("extractTablesCsv.title", "Extract Tables to CSV"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

export default ExtractTablesCsv as ToolComponent;
