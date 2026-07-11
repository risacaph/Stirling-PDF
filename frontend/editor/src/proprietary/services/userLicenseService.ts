import apiClient from "@app/services/apiClient";
import { type AccessTier } from "@app/utils/toolLicenseTier";

/**
 * The current user's admin-managed access license, as returned by GET /api/v1/user/license.
 * Admins and internal API accounts are reported as unlimited ULTIMATE (never expired).
 */
export interface MyLicense {
  tier: AccessTier;
  expiresAt: string | null;
  expired: boolean;
  /** Days until expiry, or -1 when the account has no expiry (unlimited). */
  daysRemaining: number;
}

/**
 * Admin-managed per-user access licensing (distinct from the vendor/premium license). Lives in its
 * own service — rather than userManagementService — because that service is shadowed per build
 * flavor, whereas this proprietary-only feature must resolve to the same implementation everywhere.
 */
export const userLicenseService = {
  /**
   * Get the current user's admin-managed access license (tier + expiry). Fails quietly so callers
   * can treat a missing/unavailable license as "no gating".
   */
  async getMyLicense(): Promise<MyLicense> {
    const response = await apiClient.get<MyLicense>("/api/v1/user/license", {
      suppressErrorToast: true,
    });
    return response.data;
  },
};
