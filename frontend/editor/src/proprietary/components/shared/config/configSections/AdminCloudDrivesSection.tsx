import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  TextInput,
  PasswordInput,
  Switch,
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
import { SettingsStickyFooter } from "@app/components/shared/config/SettingsStickyFooter";
import apiClient from "@app/services/apiClient";
import { useLoginRequired } from "@app/hooks/useLoginRequired";

interface CloudDriveProviderData {
  enabled?: boolean;
  clientId?: string;
  clientSecret?: string;
}

interface CloudDrivesSettingsData {
  googleDrive?: CloudDriveProviderData;
  dropbox?: CloudDriveProviderData;
  oneDrive?: CloudDriveProviderData;
}

type ProviderKey = "googleDrive" | "dropbox" | "oneDrive";

interface ProviderMeta {
  key: ProviderKey;
  name: string;
  clientIdLabel: string;
  clientSecretLabel: string;
}

/**
 * Admin panel for linking cloud storage providers. Backed by the generic admin-settings API
 * (`cloudDrives` section). Each provider's client secret is stored server-side and returned
 * masked, so leaving it untouched preserves the existing secret.
 */
export default function AdminCloudDrivesSection() {
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
  } = useAdminSettings<CloudDrivesSettingsData>({
    sectionName: "cloudDrives",
    fetchTransformer: async (): Promise<CloudDrivesSettingsData> => {
      const response = await apiClient.get<CloudDrivesSettingsData>(
        "/api/v1/admin/settings/section/cloudDrives",
      );
      return response.data || {};
    },
    saveTransformer: (s: CloudDrivesSettingsData) => ({
      sectionData: {},
      // Untouched secrets stay the "********" mask, so the delta comparison drops them and the
      // stored secret is preserved; only real edits are sent.
      deltaSettings: {
        "cloudDrives.googleDrive.enabled": s.googleDrive?.enabled ?? false,
        "cloudDrives.googleDrive.clientId": s.googleDrive?.clientId ?? "",
        "cloudDrives.googleDrive.clientSecret":
          s.googleDrive?.clientSecret ?? "",
        "cloudDrives.dropbox.enabled": s.dropbox?.enabled ?? false,
        "cloudDrives.dropbox.clientId": s.dropbox?.clientId ?? "",
        "cloudDrives.dropbox.clientSecret": s.dropbox?.clientSecret ?? "",
        "cloudDrives.oneDrive.enabled": s.oneDrive?.enabled ?? false,
        "cloudDrives.oneDrive.clientId": s.oneDrive?.clientId ?? "",
        "cloudDrives.oneDrive.clientSecret": s.oneDrive?.clientSecret ?? "",
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

  const updateProvider = useCallback(
    (key: ProviderKey, patch: Partial<CloudDriveProviderData>) => {
      setSettings({
        ...settings,
        [key]: { ...(settings[key] ?? {}), ...patch },
      });
    },
    [settings, setSettings],
  );

  if (loading) {
    return (
      <Stack align="center" justify="center" h={200}>
        <Loader size="lg" />
      </Stack>
    );
  }

  const providers: ProviderMeta[] = [
    {
      key: "googleDrive",
      name: t("admin.settings.cloudDrives.googleDrive", "Google Drive"),
      clientIdLabel: t("admin.settings.cloudDrives.clientId", "Client ID"),
      clientSecretLabel: t(
        "admin.settings.cloudDrives.clientSecret",
        "Client secret",
      ),
    },
    {
      key: "dropbox",
      name: t("admin.settings.cloudDrives.dropbox", "Dropbox"),
      clientIdLabel: t(
        "admin.settings.cloudDrives.appKey",
        "App key (client ID)",
      ),
      clientSecretLabel: t(
        "admin.settings.cloudDrives.appSecret",
        "App secret (client secret)",
      ),
    },
    {
      key: "oneDrive",
      name: t("admin.settings.cloudDrives.oneDrive", "OneDrive"),
      clientIdLabel: t(
        "admin.settings.cloudDrives.applicationId",
        "Application (client) ID",
      ),
      clientSecretLabel: t(
        "admin.settings.cloudDrives.clientSecret",
        "Client secret",
      ),
    },
  ];

  return (
    <div className="settings-section-container">
      <Stack gap="lg" className="settings-section-content">
        <div>
          <Text fw={600} size="lg">
            {t("admin.settings.cloudDrives.title", "Cloud Drives")}
          </Text>
          <Text size="sm" c="dimmed">
            {t(
              "admin.settings.cloudDrives.description",
              "Link cloud storage providers so users can open and save files from them. Enter each provider's OAuth credentials and enable it. Client secrets are stored server-side and never shown in the browser.",
            )}
          </Text>
        </div>

        {providers.map((provider) => {
          const data = settings[provider.key] ?? {};
          return (
            <Paper withBorder p="md" radius="md" key={provider.key}>
              <Stack gap="md">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div>
                    <Text fw={500} size="sm">
                      {provider.name}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {t(
                        "admin.settings.cloudDrives.enabledDescription",
                        "When off (default), this drive is hidden and cannot be connected.",
                      )}
                    </Text>
                  </div>
                  <Switch
                    checked={data.enabled || false}
                    onChange={(e) =>
                      updateProvider(provider.key, {
                        enabled: e.target.checked,
                      })
                    }
                  />
                </Group>

                <TextInput
                  label={provider.clientIdLabel}
                  value={data.clientId || ""}
                  onChange={(e) =>
                    updateProvider(provider.key, {
                      clientId: e.target.value,
                    })
                  }
                  disabled={!data.enabled}
                />

                <PasswordInput
                  label={provider.clientSecretLabel}
                  description={t(
                    "admin.settings.cloudDrives.clientSecretDescription",
                    "Stored server-side and never shown; leave unchanged to keep the current secret.",
                  )}
                  value={data.clientSecret || ""}
                  onChange={(e) =>
                    updateProvider(provider.key, {
                      clientSecret: e.target.value,
                    })
                  }
                  placeholder="••••••••"
                  disabled={!data.enabled}
                />
              </Stack>
            </Paper>
          );
        })}

        <Alert
          variant="light"
          color="blue"
          icon={<LocalIcon icon="info-rounded" width="1rem" height="1rem" />}
        >
          <Text size="xs">
            {t(
              "admin.settings.cloudDrives.note",
              "Create an OAuth app in each provider's developer console, then paste its client ID and secret here. Add this server's callback URL as an authorized redirect URI in that console.",
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
