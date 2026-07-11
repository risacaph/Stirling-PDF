import { type ToolRegistryEntry } from "@app/data/toolsTaxonomy";

export type AccessTier = "FREE" | "PRO" | "ULTIMATE";

export const TIER_RANK: Record<AccessTier, number> = {
  FREE: 0,
  PRO: 1,
  ULTIMATE: 2,
};

// Mirror of the backend keyword mapping in UserLicenseAccessService.requiredTierForPath: the tier
// required to use a tool is derived from case-insensitive substrings of its API path(s). Keep these
// lists in sync with the backend.
const ULTIMATE_KEYWORDS = [
  "pipeline",
  "automation",
  "workflow",
  "/ai",
  "ai/",
  "auto-",
];

const FREE_KEYWORDS = [
  "merge",
  "split",
  "rotate",
  "compress",
  "rearrange",
  "remove-pages",
  "organize",
  "page",
  "pdf-to-img",
  "img-to-pdf",
  "pdf/img",
  "img/pdf",
  "pdf-to-image",
  "image-to-pdf",
];

// Prefer the tool's real endpoint path(s) so classification matches what the backend interceptor
// sees; fall back to the tool id only when no endpoint string is known (e.g. dynamic endpoints).
function candidatePaths(id: string, tool: ToolRegistryEntry): string[] {
  const endpointPaths: string[] = [];
  const endpoint = tool.operationConfig?.endpoint;
  if (typeof endpoint === "string") {
    endpointPaths.push(endpoint);
  }
  if (tool.endpoints) {
    endpointPaths.push(...tool.endpoints);
  }
  const paths = endpointPaths.length > 0 ? endpointPaths : [id];
  return paths.map((path) => path.toLowerCase());
}

/** The minimum access tier required to use the given tool (mirrors the backend). */
export function tierForTool(id: string, tool: ToolRegistryEntry): AccessTier {
  const paths = candidatePaths(id, tool);
  if (paths.some((path) => ULTIMATE_KEYWORDS.some((k) => path.includes(k)))) {
    return "ULTIMATE";
  }
  if (paths.some((path) => FREE_KEYWORDS.some((k) => path.includes(k)))) {
    return "FREE";
  }
  return "PRO";
}
