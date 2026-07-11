import React from "react";
import {
  Stack,
  Paper,
  Group,
  ThemeIcon,
  Title,
  Text,
  List,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import LocalIcon from "@app/components/shared/LocalIcon";

/**
 * Self-hosted access panel.
 *
 * <p>This build has no vendor plans, license keys, or billing — every premium/enterprise feature is
 * unlocked. What remains configurable is the admin-managed, per-user access plan (Free / Pro /
 * Ultimate), which is assigned from the People section. This panel explains that and points there.
 */
const AdminPlanSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack gap="lg">
      <Paper withBorder p="lg" radius="md">
        <Group align="flex-start" gap="md" wrap="nowrap">
          <ThemeIcon size={44} radius="md" variant="light" color="teal">
            <LocalIcon
              icon="check-circle-rounded"
              width="1.5rem"
              height="1.5rem"
            />
          </ThemeIcon>
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Title order={4}>
              {t("settings.plan.selfHosted.title", "Self-hosted build")}
            </Title>
            <Text c="dimmed" size="sm">
              {t(
                "settings.plan.selfHosted.allUnlocked",
                "All premium and enterprise features are unlocked on this self-hosted Papyra deployment. There is no vendor subscription, license key, or user limit.",
              )}
            </Text>
          </Stack>
        </Group>
      </Paper>

      <Paper withBorder p="lg" radius="md">
        <Stack gap="sm">
          <Title order={5}>
            {t(
              "settings.plan.selfHosted.perUserTitle",
              "Per-user access plans",
            )}
          </Title>
          <Text size="sm">
            {t(
              "settings.plan.selfHosted.perUserBody",
              "Access is managed per user account. Assign each user an access plan from the People section:",
            )}
          </Text>
          <List spacing="xs" size="sm">
            <List.Item>
              {t(
                "settings.plan.selfHosted.tierFree",
                "Free — 7-day trial, basic tools",
              )}
            </List.Item>
            <List.Item>
              {t(
                "settings.plan.selfHosted.tierPro",
                "Pro — 1 year, most tools",
              )}
            </List.Item>
            <List.Item>
              {t(
                "settings.plan.selfHosted.tierUltimate",
                "Ultimate — 5 years, all tools",
              )}
            </List.Item>
          </List>
          <Text c="dimmed" size="xs">
            {t(
              "settings.plan.selfHosted.manageHint",
              "Go to Settings → People to change a user's access plan. Expired users can still sign in, but the app becomes read-only until an admin renews their plan.",
            )}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default AdminPlanSection;
