import { useCallback, useEffect, useState } from "react";
import { Paper, Stack, Group, Text, Badge, Button, Alert } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { deviceService, type DeviceInfo } from "@app/services/deviceService";

/**
 * Lists the devices signed in to the current user's account and lets them remove one. Devices count
 * toward the plan's device limit (enforced at sign-in); removing one frees a slot.
 */
export function AccountDevices() {
  const { t, i18n } = useTranslation();
  const [devices, setDevices] = useState<DeviceInfo[] | null>(null);
  const [maxDevices, setMaxDevices] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);

  const load = useCallback(() => {
    deviceService
      .getDevices()
      .then((data) => {
        setDevices(data.devices);
        setMaxDevices(data.maxDevices);
        setError(null);
      })
      .catch(() =>
        setError(
          t("account.devices.loadError", "Could not load your devices."),
        ),
      );
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = useCallback(
    async (id: number) => {
      setRevoking(id);
      try {
        await deviceService.revokeDevice(id);
        load();
      } catch {
        setError(
          t("account.devices.revokeError", "Could not remove that device."),
        );
      } finally {
        setRevoking(null);
      }
    },
    [load, t],
  );

  // Stay quiet until the first load resolves (nothing useful to show yet).
  if (!devices && !error) {
    return null;
  }

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={600}>{t("account.devices.title", "Devices")}</Text>
          {maxDevices !== null && (
            <Badge variant="light" color="teal">
              {t("account.devices.count", "{{used}} of {{max}}", {
                used: devices?.length ?? 0,
                max: maxDevices,
              })}
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {t(
            "account.devices.description",
            "Devices signed in to your account. Your plan allows a limited number; remove one to free a slot.",
          )}
        </Text>

        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        {devices && devices.length === 0 && (
          <Text size="sm" c="dimmed">
            {t("account.devices.none", "No devices registered yet.")}
          </Text>
        )}

        {devices?.map((device) => (
          <Group
            key={device.id}
            justify="space-between"
            align="center"
            wrap="nowrap"
            gap="sm"
          >
            <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
              <Group gap="xs" wrap="nowrap">
                <Text size="sm" truncate>
                  {device.label ||
                    t("account.devices.unknown", "Unknown device")}
                </Text>
                {device.current && (
                  <Badge size="xs" variant="light" color="teal">
                    {t("account.devices.thisDevice", "This device")}
                  </Badge>
                )}
              </Group>
              {device.lastSeenAt && (
                <Text size="xs" c="dimmed">
                  {t("account.devices.lastSeen", "Last used {{date}}", {
                    date: new Date(device.lastSeenAt).toLocaleString(
                      i18n.language,
                    ),
                  })}
                </Text>
              )}
            </Stack>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              loading={revoking === device.id}
              onClick={() => revoke(device.id)}
            >
              {t("account.devices.remove", "Remove")}
            </Button>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}
