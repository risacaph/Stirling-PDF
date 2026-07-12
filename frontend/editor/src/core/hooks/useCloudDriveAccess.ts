/**
 * Whether the current user may use cloud-drive integrations such as the Google Drive picker.
 *
 * The open-source core has no access tiers, so cloud drives are always available here. The
 * proprietary build overrides this hook to restrict cloud drives to paid plans (non-Free,
 * unexpired).
 */
export function useCloudDriveAccess(): boolean {
  return true;
}
