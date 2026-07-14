import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Card,
  Divider,
  Group,
  Loader,
  NumberInput,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { Button } from "@app/ui/Button";
import { SegmentedControl } from "@app/ui/SegmentedControl";
import { ActionIcon } from "@app/ui/ActionIcon";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import ErrorNotification from "@app/components/tools/shared/ErrorNotification";
import ResultsPreview from "@app/components/tools/shared/ResultsPreview";
import { downloadFromUrl } from "@app/services/downloadService";
import { thumbnailGenerationService } from "@app/services/thumbnailGenerationService";
import { StirlingFile } from "@app/types/fileContext";
import {
  ExistingLinkRef,
  LinkTargetType,
  NewLink,
} from "@app/hooks/tools/linkEditor/useLinkEditorParameters";
import { ExtractedLink } from "@app/hooks/tools/linkEditor/linkEditorApi";
import styles from "@app/components/tools/linkEditor/LinkEditorWorkbenchView.module.css";

export interface LinkEditorWorkbenchViewData {
  file: StirlingFile | null;
  totalPages: number;
  additions: NewLink[];
  removals: ExistingLinkRef[];
  existingLinks: ExtractedLink[];
  existingLinksLoading: boolean;
  existingLinksError: string | null;
  disabled: boolean;
  hasResults: boolean;
  files: File[];
  thumbnails: (string | undefined)[];
  downloadUrl: string | null;
  downloadFilename: string | null;
  errorMessage: string | null;
  isExecuting: boolean;
  isExecuteDisabled: boolean;
  onAdditionsChange: (additions: NewLink[]) => void;
  onRemovalsChange: (removals: ExistingLinkRef[]) => void;
  onExecute: () => void;
  onUndo: () => void;
  onClearError: () => void;
  onFileClick: (file: File) => void;
}

interface LinkEditorWorkbenchViewProps {
  data: LinkEditorWorkbenchViewData | null;
}

type Selection =
  | { kind: "new"; id: string }
  | { kind: "existing"; key: string }
  | null;

interface DraftRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

const DEFAULT_LINK_SIZE = { width: 0.2, height: 0.03 };

const existingKey = (link: {
  pageIndex: number;
  annotationIndex: number;
}): string => `${link.pageIndex}-${link.annotationIndex}`;

const LinkEditorWorkbenchView = ({ data }: LinkEditorWorkbenchViewProps) => {
  const { t } = useTranslation();

  const [pageIndex, setPageIndex] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [pageImages, setPageImages] = useState<Map<number, string>>(new Map());
  const [renderingPage, setRenderingPage] = useState(false);
  const [drawArmed, setDrawArmed] = useState(false);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const file = data?.file ?? null;
  const totalPages = data?.totalPages ?? 1;
  const additions = useMemo(() => data?.additions ?? [], [data?.additions]);
  const removals = useMemo(() => data?.removals ?? [], [data?.removals]);
  const existingLinks = useMemo(
    () => data?.existingLinks ?? [],
    [data?.existingLinks],
  );

  // Reset transient view state whenever the underlying file changes.
  useEffect(() => {
    setPageIndex(0);
    setSelection(null);
    setPageImages(new Map());
    setDrawArmed(false);
    setDraft(null);
  }, [file?.fileId]);

  // Render the current page as a backdrop image on demand (cached per page).
  useEffect(() => {
    let cancelled = false;
    if (!file || pageImages.has(pageIndex)) {
      return;
    }
    setRenderingPage(true);
    (async () => {
      try {
        const buffer = await file.arrayBuffer();
        const results = await thumbnailGenerationService.generateThumbnails(
          file.fileId,
          buffer,
          [pageIndex + 1],
          { scale: 1.5 },
        );
        const thumbnail = results[0]?.thumbnail;
        if (!cancelled && thumbnail) {
          setPageImages((prev) => {
            const next = new Map(prev);
            next.set(pageIndex, thumbnail);
            return next;
          });
        }
      } catch (error) {
        console.error("[LinkEditor] Failed to render page backdrop:", error);
      } finally {
        if (!cancelled) {
          setRenderingPage(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageIndex, pageImages]);

  useEffect(() => () => dragCleanupRef.current?.(), []);

  const onAdditionsChange = data?.onAdditionsChange;
  const onRemovalsChange = data?.onRemovalsChange;

  const updateAddition = useCallback(
    (id: string, patch: Partial<NewLink>) => {
      if (!onAdditionsChange) return;
      onAdditionsChange(
        additions.map((link) =>
          link.id === id ? { ...link, ...patch } : link,
        ),
      );
    },
    [additions, onAdditionsChange],
  );

  const deleteAddition = useCallback(
    (id: string) => {
      if (!onAdditionsChange) return;
      onAdditionsChange(additions.filter((link) => link.id !== id));
      setSelection((current) =>
        current?.kind === "new" && current.id === id ? null : current,
      );
    },
    [additions, onAdditionsChange],
  );

  const removedKeys = useMemo(
    () => new Set(removals.map(existingKey)),
    [removals],
  );

  const toggleRemoval = useCallback(
    (link: ExtractedLink) => {
      if (!onRemovalsChange) return;
      const key = existingKey(link);
      if (removedKeys.has(key)) {
        onRemovalsChange(
          removals.filter((removal) => existingKey(removal) !== key),
        );
      } else {
        onRemovalsChange([
          ...removals,
          { pageIndex: link.pageIndex, annotationIndex: link.annotationIndex },
        ]);
      }
    },
    [onRemovalsChange, removals, removedKeys],
  );

  const commitDraft = useCallback(
    (rect: DraftRect) => {
      if (!onAdditionsChange) return;
      const size =
        rect.width > 0.01 && rect.height > 0.01
          ? { width: rect.width, height: rect.height }
          : DEFAULT_LINK_SIZE;
      const newLink: NewLink = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `link-${Date.now()}-${additions.length}`,
        pageIndex,
        x: clamp(rect.x, 0, 1 - size.width),
        y: clamp(rect.y, 0, 1 - size.height),
        width: size.width,
        height: size.height,
        target: "uri",
        uri: "",
        targetPage: 1,
      };
      onAdditionsChange([...additions, newLink]);
      setSelection({ kind: "new", id: newLink.id });
    },
    [additions, onAdditionsChange, pageIndex],
  );

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!drawArmed || !canvas) {
        setSelection(null);
        return;
      }
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const startX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const startY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
      let lastDraft: DraftRect = { x: startX, y: startY, width: 0, height: 0 };
      setDraft(lastDraft);

      const handleMove = (moveEvent: PointerEvent) => {
        // Re-measure so scrolling mid-draw doesn't skew the fractions.
        const bounds = canvasRef.current?.getBoundingClientRect();
        if (!bounds) return;
        const currentX = clamp(
          (moveEvent.clientX - bounds.left) / bounds.width,
          0,
          1,
        );
        const currentY = clamp(
          (moveEvent.clientY - bounds.top) / bounds.height,
          0,
          1,
        );
        lastDraft = {
          x: Math.min(startX, currentX),
          y: Math.min(startY, currentY),
          width: Math.abs(currentX - startX),
          height: Math.abs(currentY - startY),
        };
        setDraft(lastDraft);
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        dragCleanupRef.current = null;
        setDraft(null);
        setDrawArmed(false);
        commitDraft(lastDraft);
      };

      dragCleanupRef.current?.();
      dragCleanupRef.current = handleUp;
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [commitDraft, drawArmed],
  );

  const beginDrag = useCallback(
    (event: React.PointerEvent, link: NewLink, mode: "move" | "resize") => {
      event.preventDefault();
      event.stopPropagation();
      setSelection({ kind: "new", id: link.id });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const startBounds = canvas.getBoundingClientRect();
      const startFx = (event.clientX - startBounds.left) / startBounds.width;
      const startFy = (event.clientY - startBounds.top) / startBounds.height;
      const origin = {
        x: link.x,
        y: link.y,
        width: link.width,
        height: link.height,
      };

      const handleMove = (moveEvent: PointerEvent) => {
        // Re-measure so scrolling mid-drag doesn't skew the fractions.
        const bounds = canvasRef.current?.getBoundingClientRect();
        if (!bounds) return;
        const dx = (moveEvent.clientX - bounds.left) / bounds.width - startFx;
        const dy = (moveEvent.clientY - bounds.top) / bounds.height - startFy;
        if (mode === "move") {
          updateAddition(link.id, {
            x: clamp(origin.x + dx, 0, 1 - origin.width),
            y: clamp(origin.y + dy, 0, 1 - origin.height),
          });
        } else {
          updateAddition(link.id, {
            width: clamp(origin.width + dx, 0.01, 1 - origin.x),
            height: clamp(origin.height + dy, 0.01, 1 - origin.y),
          });
        }
      };

      const handleUp = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        dragCleanupRef.current = null;
      };

      dragCleanupRef.current?.();
      dragCleanupRef.current = handleUp;
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [updateAddition],
  );

  const selectedAddition = useMemo(
    () =>
      selection?.kind === "new"
        ? (additions.find((link) => link.id === selection.id) ?? null)
        : null,
    [additions, selection],
  );

  const selectedExisting = useMemo(
    () =>
      selection?.kind === "existing"
        ? (existingLinks.find((link) => existingKey(link) === selection.key) ??
          null)
        : null,
    [existingLinks, selection],
  );

  const pageAdditions = useMemo(
    () => additions.filter((link) => link.pageIndex === pageIndex),
    [additions, pageIndex],
  );

  const pageExisting = useMemo(
    () => existingLinks.filter((link) => link.pageIndex === pageIndex),
    [existingLinks, pageIndex],
  );

  const previewFiles = useMemo(() => {
    const files = data?.files ?? [];
    const thumbnails = data?.thumbnails ?? [];
    return files.map((f, index) => ({ file: f, thumbnail: thumbnails[index] }));
  }, [data?.files, data?.thumbnails]);

  const describeExisting = (link: ExtractedLink): string => {
    if (link.type === "uri" && link.uri) return link.uri;
    if (link.type === "page" && link.targetPage) {
      return t("linkEditor.existing.pageTarget", "Go to page {{page}}", {
        page: link.targetPage,
      });
    }
    return t("linkEditor.existing.otherTarget", "Other action");
  };

  if (!data) {
    return (
      <Box p="xl">
        <Card withBorder radius="md">
          <Text fw={600}>
            {t(
              "linkEditor.workbench.empty.title",
              "Open the tool to edit links",
            )}
          </Text>
          <Text size="sm" c="dimmed" mt="xs">
            {t(
              "linkEditor.workbench.empty.description",
              "Select the Link Editor tool and choose a PDF to add or remove hyperlinks.",
            )}
          </Text>
        </Card>
      </Box>
    );
  }

  // Results view — mirror the standard results preview once edits are applied.
  if (data.hasResults) {
    return (
      <Box p="lg" className={styles.resultsWrap}>
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>
              {t("linkEditor.results.title", "Links updated")}
            </Text>
            <Group gap="xs">
              {data.downloadUrl && data.downloadFilename && (
                <Button
                  onClick={() =>
                    downloadFromUrl(data.downloadUrl!, data.downloadFilename!)
                  }
                >
                  {t("linkEditor.results.download", "Download")}
                </Button>
              )}
              <Button variant="secondary" onClick={data.onUndo}>
                {t("linkEditor.results.undo", "Undo")}
              </Button>
            </Group>
          </Group>
          <ResultsPreview files={previewFiles} onFileClick={data.onFileClick} />
        </Stack>
      </Box>
    );
  }

  const backdrop = pageImages.get(pageIndex);

  return (
    <Box className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Group gap="xs">
          <Button
            size="sm"
            variant={drawArmed ? "primary" : "secondary"}
            disabled={!file || data.disabled}
            onClick={() => setDrawArmed((armed) => !armed)}
          >
            {drawArmed
              ? t("linkEditor.toolbar.drawArmed", "Draw a box on the page…")
              : t("linkEditor.toolbar.addLink", "Add link")}
          </Button>
          {data.existingLinksLoading && (
            <Group gap={6}>
              <Loader size="xs" />
              <Text size="xs" c="dimmed">
                {t("linkEditor.toolbar.scanning", "Scanning links…")}
              </Text>
            </Group>
          )}
        </Group>

        <Group gap="xs">
          <ActionIcon
            variant="secondary"
            size="md"
            disabled={pageIndex <= 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            aria-label={t("linkEditor.toolbar.prevPage", "Previous page")}
          >
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </ActionIcon>
          <Text size="sm">
            {t("linkEditor.toolbar.page", "Page")} {pageIndex + 1} /{" "}
            {totalPages}
          </Text>
          <ActionIcon
            variant="secondary"
            size="md"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            aria-label={t("linkEditor.toolbar.nextPage", "Next page")}
          >
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </ActionIcon>
        </Group>

        <Button
          onClick={data.onExecute}
          loading={data.isExecuting}
          disabled={data.isExecuteDisabled}
        >
          {t("linkEditor.toolbar.apply", "Apply changes")}
        </Button>
      </div>

      {data.errorMessage && (
        <Box px="md" pt="xs">
          <ErrorNotification
            error={data.errorMessage}
            onClose={data.onClearError}
          />
        </Box>
      )}
      {data.existingLinksError && (
        <Box px="md" pt="xs">
          <Alert color="yellow" variant="light">
            <Text size="sm">{data.existingLinksError}</Text>
          </Alert>
        </Box>
      )}

      <div className={styles.body}>
        {/* Canvas */}
        <ScrollArea className={styles.canvasScroll}>
          <div className={styles.canvasCenter}>
            {!file ? (
              <Text c="dimmed">
                {t("linkEditor.canvas.noFile", "No PDF selected.")}
              </Text>
            ) : (
              <div
                ref={canvasRef}
                className={`${styles.canvas} ${
                  drawArmed ? styles.canvasDrawing : ""
                }`}
                onPointerDown={handleCanvasPointerDown}
              >
                {backdrop ? (
                  <img
                    src={backdrop}
                    alt={t("linkEditor.canvas.pageAlt", "PDF page")}
                    className={styles.pageImage}
                    draggable={false}
                  />
                ) : (
                  <div className={styles.pagePlaceholder}>
                    {renderingPage ? (
                      <Loader size="sm" />
                    ) : (
                      <Text size="sm" c="dimmed">
                        {t("linkEditor.canvas.loading", "Rendering page…")}
                      </Text>
                    )}
                  </div>
                )}

                {pageExisting.map((link) => {
                  const key = existingKey(link);
                  const isSelected =
                    selection?.kind === "existing" && selection.key === key;
                  const isRemoved = removedKeys.has(key);
                  return (
                    <div
                      key={key}
                      className={`${styles.existingBox} ${
                        isSelected ? styles.existingBoxSelected : ""
                      } ${isRemoved ? styles.existingBoxRemoved : ""}`}
                      style={{
                        left: `${link.x * 100}%`,
                        top: `${link.y * 100}%`,
                        width: `${link.width * 100}%`,
                        height: `${link.height * 100}%`,
                        // While drawing, let the pointer reach the canvas so a new
                        // link can be drawn on top of an existing one.
                        pointerEvents: drawArmed ? "none" : undefined,
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelection({ kind: "existing", key });
                      }}
                    >
                      <span className={styles.linkLabel}>
                        {describeExisting(link)}
                      </span>
                    </div>
                  );
                })}

                {pageAdditions.map((link) => {
                  const isSelected =
                    selection?.kind === "new" && selection.id === link.id;
                  return (
                    <div
                      key={link.id}
                      className={`${styles.linkBox} ${
                        isSelected ? styles.linkBoxSelected : ""
                      }`}
                      style={{
                        left: `${link.x * 100}%`,
                        top: `${link.y * 100}%`,
                        width: `${link.width * 100}%`,
                        height: `${link.height * 100}%`,
                        // While drawing, let the pointer reach the canvas so a new
                        // link can be drawn on top of an existing one.
                        pointerEvents: drawArmed ? "none" : undefined,
                      }}
                      onPointerDown={(e) => beginDrag(e, link, "move")}
                    >
                      <span className={styles.linkLabel}>
                        {link.target === "uri"
                          ? link.uri ||
                            t("linkEditor.canvas.newLink", "New link")
                          : t(
                              "linkEditor.existing.pageTarget",
                              "Go to page {{page}}",
                              {
                                page: link.targetPage,
                              },
                            )}
                      </span>
                      <span
                        className={styles.resizeHandle}
                        onPointerDown={(e) => beginDrag(e, link, "resize")}
                      />
                    </div>
                  );
                })}

                {draft && (
                  <div
                    className={styles.draftBox}
                    style={{
                      left: `${draft.x * 100}%`,
                      top: `${draft.y * 100}%`,
                      width: `${draft.width * 100}%`,
                      height: `${draft.height * 100}%`,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Link properties */}
        <div className={styles.sidebar}>
          <Text fw={600} size="sm" mb="xs">
            {t("linkEditor.properties.title", "Link properties")}
          </Text>
          {selectedAddition ? (
            <Stack gap="sm">
              <SegmentedControl<LinkTargetType>
                fullWidth
                value={selectedAddition.target}
                onChange={(value) =>
                  updateAddition(selectedAddition.id, { target: value })
                }
                options={[
                  {
                    value: "uri",
                    label: t("linkEditor.properties.targetUri", "Web address"),
                  },
                  {
                    value: "page",
                    label: t("linkEditor.properties.targetPage", "Page"),
                  },
                ]}
              />
              {selectedAddition.target === "uri" ? (
                <TextInput
                  label={t("linkEditor.properties.uri", "URL")}
                  placeholder="https://example.com"
                  value={selectedAddition.uri}
                  onChange={(e) =>
                    updateAddition(selectedAddition.id, {
                      uri: e.currentTarget.value,
                    })
                  }
                />
              ) : (
                <NumberInput
                  label={t("linkEditor.properties.pageNumber", "Target page")}
                  min={1}
                  max={totalPages}
                  value={selectedAddition.targetPage}
                  onChange={(value) =>
                    updateAddition(selectedAddition.id, {
                      targetPage:
                        typeof value === "number" ? value : Number(value) || 1,
                    })
                  }
                />
              )}
              <Divider />
              <Button
                variant="secondary"
                leftSection={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                onClick={() => deleteAddition(selectedAddition.id)}
              >
                {t("linkEditor.properties.deleteNew", "Remove new link")}
              </Button>
            </Stack>
          ) : selectedExisting ? (
            <Stack gap="sm">
              <Text size="sm">{describeExisting(selectedExisting)}</Text>
              <Button
                variant="secondary"
                onClick={() => toggleRemoval(selectedExisting)}
              >
                {removedKeys.has(existingKey(selectedExisting))
                  ? t("linkEditor.properties.restore", "Restore link")
                  : t("linkEditor.properties.remove", "Remove link")}
              </Button>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              {t(
                "linkEditor.properties.none",
                "Draw a new link or select one to edit it. Existing links are shown dashed.",
              )}
            </Text>
          )}

          <Divider my="md" />
          <Text size="xs" c="dimmed">
            {t(
              "linkEditor.properties.summary",
              "{{added}} link(s) to add, {{removed}} to remove.",
              { added: additions.length, removed: removals.length },
            )}
          </Text>
        </div>
      </div>
    </Box>
  );
};

export default LinkEditorWorkbenchView;
