import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  Checkbox,
  Divider,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { Button } from "@app/ui/Button";
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
  FormBuilderField,
  FormBuilderFieldKind,
} from "@app/hooks/tools/formBuilder/useFormBuilderParameters";
import styles from "@app/components/tools/formBuilder/FormBuilderWorkbenchView.module.css";

export interface FormBuilderWorkbenchViewData {
  file: StirlingFile | null;
  totalPages: number;
  fields: FormBuilderField[];
  disabled: boolean;
  hasResults: boolean;
  files: File[];
  thumbnails: (string | undefined)[];
  downloadUrl: string | null;
  downloadFilename: string | null;
  errorMessage: string | null;
  isExecuting: boolean;
  isExecuteDisabled: boolean;
  onFieldsChange: (fields: FormBuilderField[]) => void;
  onExecute: () => void;
  onUndo: () => void;
  onClearError: () => void;
  onFileClick: (file: File) => void;
}

interface FormBuilderWorkbenchViewProps {
  data: FormBuilderWorkbenchViewData | null;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

// Sensible default sizes (fractions of the page) per field type. Checkboxes use a small
// near-square footprint tuned for a Letter-ish aspect ratio; the user can resize afterwards.
const DEFAULT_SIZE: Record<
  FormBuilderFieldKind,
  { width: number; height: number }
> = {
  text: { width: 0.3, height: 0.03 },
  checkbox: { width: 0.03, height: 0.024 },
  combobox: { width: 0.3, height: 0.03 },
  listbox: { width: 0.3, height: 0.12 },
};

const FIELD_KINDS: FormBuilderFieldKind[] = [
  "text",
  "checkbox",
  "combobox",
  "listbox",
];

const FormBuilderWorkbenchView = ({ data }: FormBuilderWorkbenchViewProps) => {
  const { t } = useTranslation();

  // Static t() calls (not a dynamic key) so translation tooling sees each key as used.
  const kindLabel = (kind: FormBuilderFieldKind): string => {
    switch (kind) {
      case "text":
        return t("formBuilder.fieldType.text", "Text");
      case "checkbox":
        return t("formBuilder.fieldType.checkbox", "Checkbox");
      case "combobox":
        return t("formBuilder.fieldType.combobox", "Dropdown");
      case "listbox":
        return t("formBuilder.fieldType.listbox", "List");
    }
  };

  const [pageIndex, setPageIndex] = useState(0);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [pageImages, setPageImages] = useState<Map<number, string>>(new Map());
  const [renderingPage, setRenderingPage] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const file = data?.file ?? null;
  const totalPages = data?.totalPages ?? 1;
  const fields = useMemo(() => data?.fields ?? [], [data?.fields]);

  // Reset transient view state whenever the underlying file changes.
  useEffect(() => {
    setPageIndex(0);
    setSelectedFieldId(null);
    setPageImages(new Map());
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
        console.error("[FormBuilder] Failed to render page backdrop:", error);
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

  const onFieldsChange = data?.onFieldsChange;

  const updateField = useCallback(
    (id: string, patch: Partial<FormBuilderField>) => {
      if (!onFieldsChange) return;
      onFieldsChange(
        fields.map((field) =>
          field.id === id ? { ...field, ...patch } : field,
        ),
      );
    },
    [fields, onFieldsChange],
  );

  const addField = useCallback(
    (kind: FormBuilderFieldKind) => {
      if (!onFieldsChange) return;
      const size = DEFAULT_SIZE[kind];
      const samePageCount = fields.filter(
        (f) => f.pageIndex === pageIndex,
      ).length;
      const offset = (samePageCount % 6) * 0.03;
      const newField: FormBuilderField = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `field-${Date.now()}-${samePageCount}`,
        kind,
        name: `${kind}${fields.length + 1}`,
        pageIndex,
        x: clamp(0.1 + offset, 0, 1 - size.width),
        y: clamp(0.1 + offset, 0, 1 - size.height),
        width: size.width,
        height: size.height,
        required: false,
        ...(kind === "combobox" || kind === "listbox"
          ? { options: ["Option 1", "Option 2"] }
          : {}),
      };
      onFieldsChange([...fields, newField]);
      setSelectedFieldId(newField.id);
    },
    [fields, onFieldsChange, pageIndex],
  );

  const deleteField = useCallback(
    (id: string) => {
      if (!onFieldsChange) return;
      onFieldsChange(fields.filter((field) => field.id !== id));
      setSelectedFieldId((current) => (current === id ? null : current));
    },
    [fields, onFieldsChange],
  );

  const beginDrag = useCallback(
    (
      event: React.PointerEvent,
      field: FormBuilderField,
      mode: "move" | "resize",
    ) => {
      event.preventDefault();
      event.stopPropagation();
      setSelectedFieldId(field.id);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = {
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      };

      const handleMove = (moveEvent: PointerEvent) => {
        const dx = (moveEvent.clientX - startX) / rect.width;
        const dy = (moveEvent.clientY - startY) / rect.height;
        if (mode === "move") {
          updateField(field.id, {
            x: clamp(origin.x + dx, 0, 1 - origin.width),
            y: clamp(origin.y + dy, 0, 1 - origin.height),
          });
        } else {
          updateField(field.id, {
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
    [updateField],
  );

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId],
  );

  const pageFields = useMemo(
    () => fields.filter((field) => field.pageIndex === pageIndex),
    [fields, pageIndex],
  );

  const previewFiles = useMemo(() => {
    const files = data?.files ?? [];
    const thumbnails = data?.thumbnails ?? [];
    return files.map((f, index) => ({ file: f, thumbnail: thumbnails[index] }));
  }, [data?.files, data?.thumbnails]);

  if (!data) {
    return (
      <Box p="xl">
        <Card withBorder radius="md">
          <Text fw={600}>
            {t(
              "formBuilder.workbench.empty.title",
              "Open the tool to start building",
            )}
          </Text>
          <Text size="sm" c="dimmed" mt="xs">
            {t(
              "formBuilder.workbench.empty.description",
              "Select the Form Builder tool and choose a PDF to add fillable fields.",
            )}
          </Text>
        </Card>
      </Box>
    );
  }

  // Results view — mirror the standard results preview once fields are applied.
  if (data.hasResults) {
    return (
      <Box p="lg" className={styles.resultsWrap}>
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>
              {t("formBuilder.results.title", "Fillable PDF ready")}
            </Text>
            <Group gap="xs">
              {data.downloadUrl && data.downloadFilename && (
                <Button
                  onClick={() =>
                    downloadFromUrl(data.downloadUrl!, data.downloadFilename!)
                  }
                >
                  {t("formBuilder.results.download", "Download")}
                </Button>
              )}
              <Button variant="secondary" onClick={data.onUndo}>
                {t("formBuilder.results.undo", "Undo")}
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
          <Text size="sm" fw={600}>
            {t("formBuilder.toolbar.addField", "Add field")}:
          </Text>
          {FIELD_KINDS.map((kind) => (
            <Button
              key={kind}
              size="sm"
              variant="secondary"
              disabled={!file || data.disabled}
              onClick={() => addField(kind)}
            >
              {kindLabel(kind)}
            </Button>
          ))}
        </Group>

        <Group gap="xs">
          <ActionIcon
            variant="secondary"
            size="md"
            disabled={pageIndex <= 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            aria-label={t("formBuilder.toolbar.prevPage", "Previous page")}
          >
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </ActionIcon>
          <Text size="sm">
            {t("formBuilder.toolbar.page", "Page")} {pageIndex + 1} /{" "}
            {totalPages}
          </Text>
          <ActionIcon
            variant="secondary"
            size="md"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            aria-label={t("formBuilder.toolbar.nextPage", "Next page")}
          >
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </ActionIcon>
        </Group>

        <Button
          onClick={data.onExecute}
          loading={data.isExecuting}
          disabled={data.isExecuteDisabled}
        >
          {t("formBuilder.toolbar.generate", "Generate PDF")}
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

      <div className={styles.body}>
        {/* Canvas */}
        <ScrollArea className={styles.canvasScroll}>
          <div className={styles.canvasCenter}>
            {!file ? (
              <Text c="dimmed">
                {t("formBuilder.canvas.noFile", "No PDF selected.")}
              </Text>
            ) : (
              <div
                ref={canvasRef}
                className={styles.canvas}
                onPointerDown={() => setSelectedFieldId(null)}
              >
                {backdrop ? (
                  <img
                    src={backdrop}
                    alt={t("formBuilder.canvas.pageAlt", "PDF page")}
                    className={styles.pageImage}
                    draggable={false}
                  />
                ) : (
                  <div className={styles.pagePlaceholder}>
                    {renderingPage ? (
                      <Loader size="sm" />
                    ) : (
                      <Text size="sm" c="dimmed">
                        {t("formBuilder.canvas.loading", "Rendering page…")}
                      </Text>
                    )}
                  </div>
                )}

                {pageFields.map((field) => {
                  const isSelected = field.id === selectedFieldId;
                  return (
                    <div
                      key={field.id}
                      className={`${styles.fieldBox} ${
                        isSelected ? styles.fieldBoxSelected : ""
                      }`}
                      style={{
                        left: `${field.x * 100}%`,
                        top: `${field.y * 100}%`,
                        width: `${field.width * 100}%`,
                        height: `${field.height * 100}%`,
                      }}
                      onPointerDown={(e) => beginDrag(e, field, "move")}
                    >
                      <span className={styles.fieldLabel}>
                        {field.name || field.kind}
                      </span>
                      <span
                        className={styles.resizeHandle}
                        onPointerDown={(e) => beginDrag(e, field, "resize")}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Field properties */}
        <div className={styles.sidebar}>
          <Text fw={600} size="sm" mb="xs">
            {t("formBuilder.properties.title", "Field properties")}
          </Text>
          {selectedField ? (
            <Stack gap="sm">
              <TextInput
                label={t("formBuilder.properties.name", "Field name")}
                value={selectedField.name}
                onChange={(e) =>
                  updateField(selectedField.id, {
                    name: e.currentTarget.value,
                  })
                }
              />
              <Text size="xs" c="dimmed">
                {t("formBuilder.properties.type", "Type")}:{" "}
                {kindLabel(selectedField.kind)}
              </Text>
              <Checkbox
                label={t("formBuilder.properties.required", "Required")}
                checked={selectedField.required ?? false}
                onChange={(e) =>
                  updateField(selectedField.id, {
                    required: e.currentTarget.checked,
                  })
                }
              />
              {(selectedField.kind === "combobox" ||
                selectedField.kind === "listbox") && (
                <Textarea
                  label={t(
                    "formBuilder.properties.options",
                    "Options (one per line)",
                  )}
                  autosize
                  minRows={2}
                  value={(selectedField.options ?? []).join("\n")}
                  onChange={(e) =>
                    updateField(selectedField.id, {
                      options: e.currentTarget.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0),
                    })
                  }
                />
              )}
              <Divider />
              <Button
                variant="secondary"
                leftSection={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
                onClick={() => deleteField(selectedField.id)}
              >
                {t("formBuilder.properties.delete", "Delete field")}
              </Button>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              {t(
                "formBuilder.properties.none",
                "Add a field or select one to edit its properties.",
              )}
            </Text>
          )}

          <Divider my="md" />
          <Text size="xs" c="dimmed">
            {t(
              "formBuilder.properties.count",
              "{{count}} field(s) total across all pages.",
              { count: fields.length },
            )}
          </Text>
        </div>
      </div>
    </Box>
  );
};

export default FormBuilderWorkbenchView;
