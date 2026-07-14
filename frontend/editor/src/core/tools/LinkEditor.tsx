import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import LinkIcon from "@mui/icons-material/Link";
import { useStableCallback } from "@app/hooks/tools/formBuilder/useStableCallback";
import { createToolFlow } from "@app/components/tools/shared/createToolFlow";
import LinkEditorSettings from "@app/components/tools/linkEditor/LinkEditorSettings";
import LinkEditorWorkbenchView, {
  LinkEditorWorkbenchViewData,
} from "@app/components/tools/linkEditor/LinkEditorWorkbenchView";
import {
  ExistingLinkRef,
  NewLink,
  useLinkEditorParameters,
} from "@app/hooks/tools/linkEditor/useLinkEditorParameters";
import { useLinkEditorOperation } from "@app/hooks/tools/linkEditor/useLinkEditorOperation";
import {
  ExtractedLink,
  fetchLinkExtraction,
} from "@app/hooks/tools/linkEditor/linkEditorApi";
import { extractErrorMessage } from "@app/utils/toolErrorHandler";
import { useBaseTool } from "@app/hooks/tools/shared/useBaseTool";
import { BaseToolProps, ToolComponent } from "@app/types/tool";
import { useToolWorkflow } from "@app/contexts/ToolWorkflowContext";
import { useFileState } from "@app/contexts/FileContext";
import {
  useNavigationActions,
  useNavigationState,
} from "@app/contexts/NavigationContext";

const WORKBENCH_VIEW_ID = "linkEditorWorkbench";
const WORKBENCH_ID = "custom:linkEditor" as const;

const LinkEditor = (props: BaseToolProps) => {
  const { t } = useTranslation();
  const base = useBaseTool(
    "linkEditor",
    useLinkEditorParameters,
    useLinkEditorOperation,
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

  const viewIcon = useMemo(() => <LinkIcon fontSize="small" />, []);
  const hasAutoOpenedRef = useRef(false);
  // The file whose annotation indices the current additions/removals were authored against.
  const authoredForFileIdRef = useRef<string | null>(null);

  const selectedFile = base.selectedFiles[0] ?? null;
  const totalPages = selectedFile
    ? (selectors.getStirlingFileStub(selectedFile.fileId)?.processedFile
        ?.totalPages ?? 1)
    : 1;
  const { updateParameter } = base.params;

  // Existing links in the selected file, fetched from the backend for overlay/removal.
  const [existingLinks, setExistingLinks] = useState<ExtractedLink[]>([]);
  const [existingLinksLoading, setExistingLinksLoading] = useState(false);
  const [existingLinksError, setExistingLinksError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    setExistingLinks([]);
    setExistingLinksError(null);
    if (!selectedFile) {
      return;
    }
    setExistingLinksLoading(true);
    (async () => {
      try {
        const extraction = await fetchLinkExtraction(selectedFile);
        if (!cancelled) {
          setExistingLinks(extraction.links);
        }
      } catch (error) {
        if (!cancelled) {
          setExistingLinksError(extractErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setExistingLinksLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  useEffect(() => {
    registerCustomWorkbenchView({
      id: WORKBENCH_VIEW_ID,
      workbenchId: WORKBENCH_ID,
      label: "Link editor workspace",
      icon: viewIcon,
      component: LinkEditorWorkbenchView,
    });

    return () => {
      clearCustomWorkbenchViewData(WORKBENCH_VIEW_ID);
      unregisterCustomWorkbenchView(WORKBENCH_VIEW_ID);
    };
    // Register once; re-registering would clear data mid-flight.
  }, []);

  // Stable handler identities so the data effect only re-runs on real data changes.
  const handleAdditionsChange = useStableCallback((additions: NewLink[]) => {
    authoredForFileIdRef.current = selectedFile?.fileId ?? null;
    updateParameter("additions", additions);
  });
  const handleRemovalsChange = useStableCallback(
    (removals: ExistingLinkRef[]) => {
      authoredForFileIdRef.current = selectedFile?.fileId ?? null;
      updateParameter("removals", removals);
    },
  );

  // Link edits reference a specific file's annotation indices. Drop them when a
  // different file becomes active so stale indices can't delete the wrong links.
  // The results view is left intact: the swap to the output file is expected there.
  useEffect(() => {
    const currentFileId = selectedFile?.fileId ?? null;
    const authoredFor = authoredForFileIdRef.current;
    if (
      authoredFor === null ||
      authoredFor === currentFileId ||
      base.hasResults
    ) {
      return;
    }
    authoredForFileIdRef.current = null;
    base.params.resetParameters();
  }, [selectedFile, base.hasResults, base.params]);
  const handleExecute = useStableCallback(() => {
    void base.handleExecute();
  });
  const handleUndo = useStableCallback(() => base.handleUndo());
  const handleClearError = useStableCallback(() => base.operation.clearError());
  const handleFileClick = useStableCallback((file: File) =>
    base.handleThumbnailClick(file),
  );

  // Keep the workspace fed with the current links, file and callbacks.
  useEffect(() => {
    const data: LinkEditorWorkbenchViewData = {
      file: selectedFile,
      totalPages,
      additions: base.params.parameters.additions,
      removals: base.params.parameters.removals,
      existingLinks,
      existingLinksLoading,
      existingLinksError,
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
        !base.params.validateParameters() ||
        base.operation.isLoading ||
        base.endpointLoading,
      onAdditionsChange: handleAdditionsChange,
      onRemovalsChange: handleRemovalsChange,
      onExecute: handleExecute,
      onUndo: handleUndo,
      onClearError: handleClearError,
      onFileClick: handleFileClick,
    };

    setCustomWorkbenchViewData(WORKBENCH_VIEW_ID, data);
  }, [
    selectedFile,
    totalPages,
    base.params.parameters.additions,
    base.params.parameters.removals,
    existingLinks,
    existingLinksLoading,
    existingLinksError,
    base.endpointLoading,
    base.hasFiles,
    base.hasResults,
    base.operation.files,
    base.operation.thumbnails,
    base.operation.downloadUrl,
    base.operation.downloadFilename,
    base.operation.errorMessage,
    base.operation.isLoading,
    handleAdditionsChange,
    handleRemovalsChange,
    handleExecute,
    handleUndo,
    handleClearError,
    handleFileClick,
    setCustomWorkbenchViewData,
  ]);

  // Open the workspace automatically when the tool is selected.
  useEffect(() => {
    if (navigationState.selectedTool !== "linkEditor") {
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
        title: t("linkEditor.settings.title", "Link editor"),
        isCollapsed: false,
        content: <LinkEditorSettings parameters={base.params.parameters} />,
      },
    ],
    executeButton: {
      text: t("linkEditor.submit", "Apply changes"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: base.handleExecute,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("linkEditor.results.title", "Links updated"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

(LinkEditor as ToolComponent).tool = () => useLinkEditorOperation;

export default LinkEditor as ToolComponent;
