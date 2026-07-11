package stirling.software.proprietary.security.model;

import java.util.Locale;

/**
 * Admin-managed per-user access tier (distinct from the vendor/premium license). Controls how long
 * a user's access lasts and which tools they may use. Higher {@code rank} = more access.
 *
 * <ul>
 *   <li>FREE — 7-day trial, basic tools only
 *   <li>PRO — 1 year, most tools
 *   <li>ULTIMATE — 5 years, everything
 * </ul>
 */
public enum LicenseTier {
    FREE(7, 0),
    PRO(365, 1),
    ULTIMATE(1825, 2);

    private final int durationDays;
    private final int rank;

    LicenseTier(int durationDays, int rank) {
        this.durationDays = durationDays;
        this.rank = rank;
    }

    public int getDurationDays() {
        return durationDays;
    }

    public int getRank() {
        return rank;
    }

    /** Whether this tier is at least as high as the one required. */
    public boolean covers(LicenseTier required) {
        return this.rank >= required.rank;
    }

    /** Parses a stored tier name, defaulting to {@link #FREE} for null/blank/unknown values. */
    public static LicenseTier fromString(String value) {
        if (value == null || value.isBlank()) {
            return FREE;
        }
        try {
            return LicenseTier.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return FREE;
        }
    }
}
