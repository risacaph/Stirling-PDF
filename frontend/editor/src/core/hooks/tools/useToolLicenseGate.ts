import { type ToolRegistryEntry } from "@app/data/toolsTaxonomy";
import { type ToolId } from "@app/types/toolId";
import { type ToolDisabledReason } from "@app/components/tools/fullscreen/shared";

/**
 * Extension point for admin-managed per-user access licensing.
 *
 * <p>The open-source core has no per-user licensing, so it never gates tools. The proprietary
 * build overrides this hook to lock tools above the current user's access tier (and everything once
 * their access has expired), mirroring the backend UserLicenseInterceptor.
 */
export function useToolLicenseGate(): (
  id: ToolId,
  tool: ToolRegistryEntry,
) => ToolDisabledReason {
  return () => null;
}
