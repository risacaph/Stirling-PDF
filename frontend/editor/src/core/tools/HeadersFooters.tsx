import { useTranslation } from "react-i18next";
import { createToolFlow } from "@app/components/tools/shared/createToolFlow";
import HeadersFootersSettings from "@app/components/tools/headersFooters/HeadersFootersSettings";
import { useHeadersFootersParameters } from "@app/hooks/tools/headersFooters/useHeadersFootersParameters";
import { useHeadersFootersOperation } from "@app/hooks/tools/headersFooters/useHeadersFootersOperation";
import { useBaseTool } from "@app/hooks/tools/shared/useBaseTool";
import { BaseToolProps, ToolComponent } from "@app/types/tool";

const HeadersFooters = (props: BaseToolProps) => {
  const { t } = useTranslation();

  const base = useBaseTool(
    "headersFooters",
    useHeadersFootersParameters,
    useHeadersFootersOperation,
    props,
  );

  return createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
    },
    steps: [
      {
        title: t("headersFooters.labels.settings", "Settings"),
        isCollapsed: base.settingsCollapsed,
        onCollapsedClick: base.settingsCollapsed
          ? base.handleSettingsReset
          : undefined,
        content: (
          <HeadersFootersSettings
            parameters={base.params.parameters}
            onParameterChange={base.params.updateParameter}
            disabled={base.endpointLoading}
          />
        ),
      },
    ],
    executeButton: {
      text: t("headersFooters.submit", "Add Headers & Footers"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: base.handleExecute,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("headersFooters.title", "Headers & Footers"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

export default HeadersFooters as ToolComponent;
