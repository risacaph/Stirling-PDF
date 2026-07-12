import { type ToolRegistryEntry } from "@app/data/toolsTaxonomy";
import { type ToolId } from "@app/types/toolId";
import { type ToolDisabledReason } from "@app/components/tools/fullscreen/shared";
import { useUserLicense } from "@app/hooks/useUserLicense";
import { TIER_RANK, tierForTool } from "@app/utils/toolLicenseTier";

/**
 * Gates tools by the current user's admin-managed access license: tools above the user's effective
 * tier are locked. An expired plan reports the Free tier from the backend (the Pro trial downgrades
 * to permanent Free), so expired users are gated to Free tools rather than fully locked. Mirrors the
 * backend UserLicenseInterceptor / UserLicenseAccessService.
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
    if (TIER_RANK[license.tier] < TIER_RANK[tierForTool(id, tool)]) {
      return "requiresLicenseTier";
    }
    return null;
  };
}
