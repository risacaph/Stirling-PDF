import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import PostAddIcon from "@mui/icons-material/PostAdd";
import { useStableCallback } from "@app/hooks/tools/formBuilder/useStableCallback";
import { createToolFlow } from "@app/components/tools/shared/createToolFlow";
import FormBuilderSettings from "@app/components/tools/formBuilder/FormBuilderSettings";
import FormBuilderWorkbenchView, {
  FormBuilderWorkbenchViewData,
} from "@app/components/tools/formBuilder/FormBuilderWorkbenchView";
import {
  FormBuilderField,
  useFormBuilderParameters,
} from "@app/hooks/tools/formBuilder/useFormBuilderParameters";
import { useFormBuilderOperation } from "@app/hooks/tools/formBuilder/useFormBuilderOperation";
import { useBaseTool } from "@app/hooks/tools/shared/useBaseTool";
import { BaseToolProps, ToolComponent } from "@app/types/tool";
import { useToolWorkflow } from "@app/contexts/ToolWorkflowContext";
import { useFileState } from "@app/contexts/FileContext";
import {
  useNavigationActions,
  useNavigationState,
} from "@app/contexts/NavigationContext";

const WORKBENCH_VIEW_ID = "formBuilderWorkbench";
const WORKBENCH_ID = "custom:formBuilder" as const;

const FormBuilder = (props: BaseToolProps) => {
  const { t } = useTranslation();
  const base = useBaseTool(
    "formBuilder",
    useFormBuilderParameters,
    useFormBuilderOperation,
    props,
    { minFiles: 1 },
  );

  const {
    registerCustomWorkbenchView,
    unregisterCustomWorkbenchView,
    setCustomWorkbenchViewData,
    clearCustomWorkbenchViewData,
  } = useToolWorkflow();
  const navigationState = useNavigationState();
  const { actions: navigationActions } = useNavigationActions();
  const { selectors } = useFileState();

  const viewIcon = useMemo(() => <PostAddIcon fontSize="small" />, []);
  const hasAutoOpenedRef = useRef(false);

  const selectedFile = base.selectedFiles[0] ?? null;
  const totalPages = selectedFile
    ? (selectors.getStirlingFileStub(selectedFile.fileId)?.processedFile
        ?.totalPages ?? 1)
    : 1;
  const { updateParameter } = base.params;

  useEffect(() => {
    registerCustomWorkbenchView({
      id: WORKBENCH_VIEW_ID,
      workbenchId: WORKBENCH_ID,
      label: "Form builder workspace",
      icon: viewIcon,
      component: FormBuilderWorkbenchView,
    });

    return () => {
      clearCustomWorkbenchViewData(WORKBENCH_VIEW_ID);
      unregisterCustomWorkbenchView(WORKBENCH_VIEW_ID);
    };
    // Register once; re-registering would clear data mid-flight.
  }, []);

  // Stable handler identities so the data effect only re-runs on real data changes.
  const handleFieldsChange = useStableCallback((fields: FormBuilderField[]) => {
    updateParameter("fields", fields);
  });
  const handleExecute = useStableCallback(() => {
    void base.handleExecute();
  });
  const handleUndo = useStableCallback(() => base.handleUndo());
  const handleClearError = useStableCallback(() => base.operation.clearError());
  const handleFileClick = useStableCallback((file: File) =>
    base.handleThumbnailClick(file),
  );

  // Keep the workspace fed with the current fields, file and callbacks.
  useEffect(() => {
    const data: FormBuilderWorkbenchViewData = {
      file: selectedFile,
      totalPages,
      fields: base.params.parameters.fields,
      disabled: base.endpointLoading || base.operation.isLoading,
      hasResults: base.hasResults,
      files: base.operation.files ?? [],
      thumbnails: base.operation.thumbnails ?? [],
      downloadUrl: base.operation.downloadUrl ?? null,
      downloadFilename: base.operation.downloadFilename ?? null,
      errorMessage: base.operation.errorMessage ?? null,
      isExecuting: base.operation.isLoading,
      isExecuteDisabled:
        !selectedFile ||
        !base.hasFiles ||
        base.params.parameters.fields.length === 0 ||
        base.operation.isLoading ||
        base.endpointLoading,
      onFieldsChange: handleFieldsChange,
      onExecute: handleExecute,
      onUndo: handleUndo,
      onClearError: handleClearError,
      onFileClick: handleFileClick,
    };

    setCustomWorkbenchViewData(WORKBENCH_VIEW_ID, data);
  }, [
    selectedFile,
    totalPages,
    base.params.parameters.fields,
    base.endpointLoading,
    base.hasFiles,
    base.hasResults,
    base.operation.files,
    base.operation.thumbnails,
    base.operation.downloadUrl,
    base.operation.downloadFilename,
    base.operation.errorMessage,
    base.operation.isLoading,
    handleFieldsChange,
    handleExecute,
    handleUndo,
    handleClearError,
    handleFileClick,
    setCustomWorkbenchViewData,
  ]);

  // Open the workspace automatically when the tool is selected.
  useEffect(() => {
    if (navigationState.selectedTool !== "formBuilder") {
      hasAutoOpenedRef.current = false;
      return;
    }
    if (hasAutoOpenedRef.current) {
      return;
    }
    hasAutoOpenedRef.current = true;
    setTimeout(() => {
      navigationActions.setWorkbench(WORKBENCH_ID);
    }, 0);
  }, [navigationActions, navigationState.selectedTool]);

  return createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
      minFiles: 1,
    },
    steps: [
      {
        title: t("formBuilder.settings.title", "Form builder"),
        isCollapsed: false,
        content: <FormBuilderSettings parameters={base.params.parameters} />,
      },
    ],
    executeButton: {
      text: t("formBuilder.submit", "Generate PDF"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: base.handleExecute,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("formBuilder.results.title", "Fillable PDF ready"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

(FormBuilder as ToolComponent).tool = () => useFormBuilderOperation;

export default FormBuilder as ToolComponent;
