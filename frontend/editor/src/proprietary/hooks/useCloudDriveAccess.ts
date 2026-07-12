import { useUserLicense } from "@app/hooks/useUserLicense";

/**
 * Cloud-drive integrations (e.g. the Google Drive picker) are a paid-plan feature: Free-tier users,
 * and users whose plan has expired, cannot use them; Pro and Ultimate can.
 *
 * Fails open — if the license can't be read (endpoint missing, signed out, still loading) access is
 * not gated, matching the rest of the license UI. The backend remains the source of truth.
 */
export function useCloudDriveAccess(): boolean {
  const license = useUserLicense();
  if (!license) {
    return true;
  }
  if (license.expired) {
    return false;
  }
  return license.tier !== "FREE";
}
