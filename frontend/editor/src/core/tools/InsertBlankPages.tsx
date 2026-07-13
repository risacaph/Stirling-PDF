import { useTranslation } from "react-i18next";
import { createToolFlow } from "@app/components/tools/shared/createToolFlow";
import InsertBlankPagesSettings from "@app/components/tools/insertBlankPages/InsertBlankPagesSettings";
import { useInsertBlankPagesParameters } from "@app/hooks/tools/insertBlankPages/useInsertBlankPagesParameters";
import { useInsertBlankPagesOperation } from "@app/hooks/tools/insertBlankPages/useInsertBlankPagesOperation";
import { useBaseTool } from "@app/hooks/tools/shared/useBaseTool";
import { BaseToolProps, ToolComponent } from "@app/types/tool";

const InsertBlankPages = (props: BaseToolProps) => {
  const { t } = useTranslation();

  const base = useBaseTool(
    "insertBlankPages",
    useInsertBlankPagesParameters,
    useInsertBlankPagesOperation,
    props,
  );

  return createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
    },
    steps: [
      {
        title: t("insertBlankPages.labels.settings", "Settings"),
        isCollapsed: base.settingsCollapsed,
        onCollapsedClick: base.settingsCollapsed
          ? base.handleSettingsReset
          : undefined,
        content: (
          <InsertBlankPagesSettings
            parameters={base.params.parameters}
            onParameterChange={base.params.updateParameter}
            disabled={base.endpointLoading}
          />
        ),
      },
    ],
    executeButton: {
      text: t("insertBlankPages.submit", "Insert Pages"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: base.handleExecute,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("insertBlankPages.title", "Inserted pages"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

export default InsertBlankPages as ToolComponent;
