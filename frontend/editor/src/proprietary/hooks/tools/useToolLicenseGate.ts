import { type ToolRegistryEntry } from "@app/data/toolsTaxonomy";
import { type ToolId } from "@app/types/toolId";
import { type ToolDisabledReason } from "@app/components/tools/fullscreen/shared";
import { useUserLicense } from "@app/hooks/useUserLicense";
import { TIER_RANK, tierForTool } from "@app/utils/toolLicenseTier";

/**
 * Gates tools by the current user's admin-managed access license: expired users are read-only
 * (everything locked) and tools above the user's tier are locked. Mirrors the backend
 * UserLicenseInterceptor / UserLicenseAccessService.
 *
 * <p>Fails open while the license is loading or if it can't be read — the backend remains the
 * source of truth, so this only affects the greyed-out presentation in the tool picker.
 */
export function useToolLicenseGate(): (
  id: ToolId,
  tool: ToolRegistryEntry,
) => ToolDisabledReason {
  const license = useUserLicense();
  return (id, tool) => {
    if (!license) {
      return null;
    }
    if (license.expired) {
      return "licenseExpired";
    }
    if (TIER_RANK[license.tier] < TIER_RANK[tierForTool(id, tool)]) {
      return "requiresLicenseTier";
    }
    return null;
  };
}
