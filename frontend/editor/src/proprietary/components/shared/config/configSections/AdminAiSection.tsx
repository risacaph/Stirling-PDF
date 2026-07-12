import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  TextInput,
  PasswordInput,
  Switch,
  Select,
  Stack,
  Paper,
  Text,
  Loader,
  Group,
  Alert,
} from "@mantine/core";
import { alert } from "@app/components/toast";
import LocalIcon from "@app/components/shared/LocalIcon";
import RestartConfirmationModal from "@app/components/shared/config/RestartConfirmationModal";
import { useRestartServer } from "@app/components/shared/config/useRestartServer";
import { useAdminSettings } from "@app/hooks/useAdminSettings";
import { useSettingsDirty } from "@app/hooks/useSettingsDirty";
import PendingBadge from "@app/components/shared/config/PendingBadge";
import { SettingsStickyFooter } from "@app/components/shared/config/SettingsStickyFooter";
import apiClient from "@app/services/apiClient";
import { useLoginRequired } from "@app/hooks/useLoginRequired";
import { Z_INDEX_OVER_CONFIG_MODAL } from "@app/styles/zIndex";

interface AiEngineSettingsData {
  enabled?: boolean;
  url?: string;
  provider?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string;
}

interface ApiResponseWithPending<T> {
  _pending?: Partial<T>;
}

type AiApiResponse = AiEngineSettingsData &
  ApiResponseWithPending<AiEngineSettingsData>;

/**
 * Admin panel for the AI engine and its on-demand provider. Backed by the generic admin-settings
 * API (`aiEngine` section); the API key is stored server-side and returned masked, so leaving it
 * untouched preserves the existing key.
 */
export default function AdminAiSection() {
  const { t } = useTranslation();
  const { loginEnabled } = useLoginRequired();
  const {
    restartModalOpened,
    showRestartModal,
    closeRestartModal,
    restartServer,
  } = useRestartServer();

  const {
    settings,
    setSettings,
    loading,
    saving,
    fetchSettings,
    saveSettings,
    isFieldPending,
  } = useAdminSettings<AiEngineSettingsData>({
    sectionName: "aiEngine",
    fetchTransformer: async (): Promise<
      AiEngineSettingsData & { _pending?: Partial<AiEngineSettingsData> }
    > => {
      const response = await apiClient.get<AiApiResponse>(
        "/api/v1/admin/settings/section/aiEngine",
      );
      return response.data || {};
    },
    saveTransformer: (s: AiEngineSettingsData) => ({
      sectionData: {},
      deltaSettings: {
        "aiEngine.enabled": s.enabled ?? false,
        "aiEngine.url": s.url ?? "",
        "aiEngine.provider": s.provider ?? "",
        "aiEngine.model": s.model ?? "",
        "aiEngine.baseUrl": s.baseUrl ?? "",
        // Untouched value stays the "********" mask, so the delta drops it and the stored key
        // is preserved; only a real edit is sent.
        "aiEngine.apiKey": s.apiKey ?? "",
      },
    }),
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const { isDirty, resetToSnapshot, markSaved } = useSettingsDirty(
    settings,
    loading,
  );

  const handleSave = async () => {
    try {
      await saveSettings();
      markSaved();
      showRestartModal();
    } catch (_error) {
      alert({
        alertType: "error",
        title: t("admin.error", "Error"),
        body: t("admin.settings.saveError", "Failed to save settings"),
      });
    }
  };

  const handleDiscard = useCallback(() => {
    setSettings(resetToSnapshot());
  }, [resetToSnapshot, setSettings]);

  if (loading) {
    return (
      <Stack align="center" justify="center" h={200}>
        <Loader size="lg" />
      </Stack>
    );
  }

  const provider = settings.provider || "";
  const showBaseUrl = provider === "custom" || provider === "deepseek";

  return (
    <div className="settings-section-container">
      <Stack gap="lg" className="settings-section-content">
        <div>
          <Text fw={600} size="lg">
            {t("admin.settings.ai.title", "AI")}
          </Text>
          <Text size="sm" c="dimmed">
            {t(
              "admin.settings.ai.description",
              "Enable the AI engine and choose which provider powers on-demand features like summarizing and asking questions about a document.",
            )}
          </Text>
        </div>

        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div>
                <Text fw={500} size="sm">
                  {t("admin.settings.ai.enabled.label", "Enable AI engine")}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {t(
                    "admin.settings.ai.enabled.description",
                    "When off (default), AI features are hidden and no AI calls are made.",
                  )}
                </Text>
              </div>
              <Group gap="xs">
                <Switch
                  checked={settings.enabled || false}
                  onChange={(e) =>
                    setSettings({ ...settings, enabled: e.target.checked })
                  }
                />
                <PendingBadge show={isFieldPending("enabled")} />
              </Group>
            </Group>

            <TextInput
              label={
                <Group gap="xs">
                  <span>
                    {t("admin.settings.ai.url.label", "AI engine URL")}
                  </span>
                  <PendingBadge show={isFieldPending("url")} />
                </Group>
              }
              description={t(
                "admin.settings.ai.url.description",
                "URL of the Papyra AI engine service.",
              )}
              value={settings.url || ""}
              onChange={(e) =>
                setSettings({ ...settings, url: e.target.value })
              }
              placeholder="http://localhost:5001"
              disabled={!settings.enabled}
            />

            <Select
              label={
                <Group gap="xs">
                  <span>
                    {t("admin.settings.ai.provider.label", "Provider")}
                  </span>
                  <PendingBadge show={isFieldPending("provider")} />
                </Group>
              }
              description={t(
                "admin.settings.ai.provider.description",
                "Which model provider to use. Leave as 'Engine default' to use the engine's own configured model.",
              )}
              data={[
                {
                  value: "",
                  label: t(
                    "admin.settings.ai.provider.default",
                    "Engine default",
                  ),
                },
                { value: "openai", label: "OpenAI" },
                { value: "anthropic", label: "Anthropic" },
                { value: "deepseek", label: "DeepSeek" },
                {
                  value: "custom",
                  label: t(
                    "admin.settings.ai.provider.custom",
                    "Custom (OpenAI-compatible)",
                  ),
                },
              ]}
              value={provider}
              onChange={(v) => setSettings({ ...settings, provider: v || "" })}
              allowDeselect={false}
              comboboxProps={{
                withinPortal: true,
                zIndex: Z_INDEX_OVER_CONFIG_MODAL,
              }}
              disabled={!settings.enabled}
            />

            <TextInput
              label={
                <Group gap="xs">
                  <span>{t("admin.settings.ai.model.label", "Model")}</span>
                  <PendingBadge show={isFieldPending("model")} />
                </Group>
              }
              description={t(
                "admin.settings.ai.model.description",
                "Model name for the selected provider, e.g. gpt-4o or claude-haiku-4-5.",
              )}
              value={settings.model || ""}
              onChange={(e) =>
                setSettings({ ...settings, model: e.target.value })
              }
              placeholder="gpt-4o"
              disabled={!settings.enabled || provider === ""}
            />

            {showBaseUrl && (
              <TextInput
                label={
                  <Group gap="xs">
                    <span>
                      {t("admin.settings.ai.baseUrl.label", "Base URL")}
                    </span>
                    <PendingBadge show={isFieldPending("baseUrl")} />
                  </Group>
                }
                description={t(
                  "admin.settings.ai.baseUrl.description",
                  "Base URL for a self-hosted / OpenAI-compatible endpoint (e.g. http://ollama:11434/v1).",
                )}
                value={settings.baseUrl || ""}
                onChange={(e) =>
                  setSettings({ ...settings, baseUrl: e.target.value })
                }
                placeholder="http://ollama:11434/v1"
                disabled={!settings.enabled}
              />
            )}

            <PasswordInput
              label={
                <Group gap="xs">
                  <span>{t("admin.settings.ai.apiKey.label", "API key")}</span>
                  <PendingBadge show={isFieldPending("apiKey")} />
                </Group>
              }
              description={t(
                "admin.settings.ai.apiKey.description",
                "API key for the selected provider. Stored server-side and never shown; leave unchanged to keep the current key.",
              )}
              value={settings.apiKey || ""}
              onChange={(e) =>
                setSettings({ ...settings, apiKey: e.target.value })
              }
              placeholder="••••••••"
              disabled={!settings.enabled || provider === ""}
            />
          </Stack>
        </Paper>

        <Alert
          variant="light"
          color="blue"
          icon={<LocalIcon icon="info-rounded" width="1rem" height="1rem" />}
        >
          <Text size="xs">
            {t(
              "admin.settings.ai.note",
              "The AI engine runs as a separate service. Make sure it is deployed and reachable at the URL above before enabling.",
            )}
          </Text>
        </Alert>
      </Stack>

      <SettingsStickyFooter
        isDirty={isDirty}
        saving={saving}
        loginEnabled={loginEnabled}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      <RestartConfirmationModal
        opened={restartModalOpened}
        onClose={closeRestartModal}
        onRestart={restartServer}
      />
    </div>
  );
}
