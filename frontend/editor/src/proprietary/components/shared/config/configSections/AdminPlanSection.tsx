import React, { useCallback, useEffect, useState } from "react";
import {
  Stack,
  Paper,
  Group,
  ThemeIcon,
  Title,
  Text,
  TextInput,
  NumberInput,
  Switch,
  Loader,
  Alert,
  Badge,
  Divider,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Button } from "@app/ui/Button";
import LocalIcon from "@app/components/shared/LocalIcon";
import {
  userManagementService,
  type PlanDefinition,
} from "@app/services/userManagementService";

const DEFAULT_DURATION_MONTHS = 12;

/** Best-effort extraction of the backend's error message from an apiClient failure. */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { error?: unknown } } })
      .response;
    const message = response?.data?.error;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

/**
 * Self-hosted access panel.
 *
 * <p>Every premium/enterprise feature is unlocked on this build. What remains configurable is the
 * admin-managed, per-user access plan (Free / Pro / Ultimate). This panel lets an admin edit each
 * plan's name, duration (empty = never expires), and per-user device cap; plans are then assigned to
 * users from the People section.
 */
const AdminPlanSection: React.FC = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<PlanDefinition[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [savedTier, setSavedTier] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{
    tier: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    userManagementService
      .getPlans()
      .then((data) => {
        if (active) setPlans(data);
      })
      .catch(() => {
        if (active) {
          setLoadError(
            t("settings.plan.editor.loadError", "Could not load access plans."),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [t]);

  const patchPlan = useCallback(
    (tier: string, patch: Partial<PlanDefinition>) => {
      setPlans((prev) =>
        prev
          ? prev.map((plan) =>
              plan.tier === tier ? { ...plan, ...patch } : plan,
            )
          : prev,
      );
    },
    [],
  );

  const savePlan = useCallback(
    async (plan: PlanDefinition) => {
      setSavingTier(plan.tier);
      setSavedTier(null);
      setRowError(null);
      try {
        const saved = await userManagementService.updatePlan(plan);
        patchPlan(plan.tier, saved);
        setSavedTier(plan.tier);
      } catch (error) {
        setRowError({
          tier: plan.tier,
          message: extractErrorMessage(
            error,
            t("settings.plan.editor.saveError", "Could not save the plan."),
          ),
        });
      } finally {
        setSavingTier(null);
      }
    },
    [patchPlan, t],
  );

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
        <Stack gap="md">
          <Stack gap={4}>
            <Title order={5}>
              {t("settings.plan.editor.heading", "Access plans")}
            </Title>
            <Text size="sm" c="dimmed">
              {t(
                "settings.plan.editor.description",
                "Edit each plan's name, how long it lasts, and how many devices a user may activate. Changes apply the next time a plan is assigned to a user.",
              )}
            </Text>
          </Stack>

          {loadError && <Alert color="red">{loadError}</Alert>}
          {!plans && !loadError && <Loader size="sm" />}

          {plans?.map((plan) => {
            const neverExpires = plan.durationMonths === null;
            return (
              <Paper key={plan.tier} withBorder p="md" radius="sm">
                <Stack gap="sm">
                  <Badge variant="light" color="teal">
                    {plan.tier}
                  </Badge>
                  <Group grow align="flex-start" wrap="wrap">
                    <TextInput
                      label={t(
                        "settings.plan.editor.planNameLabel",
                        "Plan name",
                      )}
                      value={plan.title}
                      onChange={(event) =>
                        patchPlan(plan.tier, {
                          title: event.currentTarget.value,
                        })
                      }
                    />
                    <NumberInput
                      label={t(
                        "settings.plan.editor.durationLabel",
                        "Duration (months)",
                      )}
                      value={plan.durationMonths ?? ""}
                      min={1}
                      max={1200}
                      allowDecimal={false}
                      disabled={neverExpires}
                      onChange={(value) =>
                        patchPlan(plan.tier, {
                          durationMonths:
                            typeof value === "number"
                              ? value
                              : Number(value) || null,
                        })
                      }
                    />
                    <NumberInput
                      label={t(
                        "settings.plan.editor.maxDevicesLabel",
                        "Max devices per user",
                      )}
                      value={plan.maxDevices}
                      min={1}
                      max={100}
                      allowDecimal={false}
                      onChange={(value) =>
                        patchPlan(plan.tier, {
                          maxDevices:
                            typeof value === "number"
                              ? value
                              : Number(value) || 1,
                        })
                      }
                    />
                  </Group>
                  <Switch
                    label={t(
                      "settings.plan.editor.neverExpires",
                      "Never expires",
                    )}
                    checked={neverExpires}
                    onChange={(event) =>
                      patchPlan(plan.tier, {
                        durationMonths: event.currentTarget.checked
                          ? null
                          : DEFAULT_DURATION_MONTHS,
                      })
                    }
                  />
                  {rowError?.tier === plan.tier && (
                    <Text size="sm" c="red">
                      {rowError.message}
                    </Text>
                  )}
                  <Group gap="sm" align="center">
                    <Button
                      size="sm"
                      onClick={() => savePlan(plan)}
                      loading={savingTier === plan.tier}
                    >
                      {t("settings.plan.editor.save", "Save")}
                    </Button>
                    {savedTier === plan.tier && (
                      <Text size="sm" c="teal">
                        {t("settings.plan.editor.saved", "Saved")}
                      </Text>
                    )}
                  </Group>
                </Stack>
              </Paper>
            );
          })}

          <Text c="dimmed" size="xs">
            {t(
              "settings.plan.editor.maxDevicesNote",
              "Device limits are saved now; enforcement at sign-in arrives in an upcoming update.",
            )}
          </Text>
          <Divider />
          <Text c="dimmed" size="xs">
            {t(
              "settings.plan.selfHosted.manageHint",
              "Go to Settings → People to change a user's access plan. New accounts start with a 7-day Pro trial, then move to the Free plan, which never expires.",
            )}
          </Text>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default AdminPlanSection;
