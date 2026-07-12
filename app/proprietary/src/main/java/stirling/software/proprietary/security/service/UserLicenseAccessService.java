package stirling.software.proprietary.security.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import stirling.software.proprietary.security.database.repository.UserRepository;
import stirling.software.proprietary.security.model.LicenseTier;
import stirling.software.proprietary.security.model.User;

/**
 * Admin-managed, per-user access licensing — distinct from the vendor/premium license (which is
 * fully unlocked). Each user has a {@link LicenseTier} plus an expiry:
 *
 * <ul>
 *   <li>expired users become read-only (their tool operations are blocked),
 *   <li>tools above the user's tier are blocked.
 * </ul>
 *
 * <p>Admins are exempt (enforced by the caller). A user with no expiry set is treated as
 * unlimited/grandfathered, and a user with no tier set is treated as {@link LicenseTier#ULTIMATE},
 * so accounts created before this feature existed are never disrupted — only newly created users
 * get the Free trial (see {@code UserService#saveUserCore}).
 */
@Service
@RequiredArgsConstructor
public class UserLicenseAccessService {

    // Tools available on the FREE trial. Matched as case-insensitive substrings of the request
    // path; deliberately coarse and easy to tune in one place.
    private static final List<String> FREE_TOOL_KEYWORDS =
            List.of(
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
                    "image-to-pdf");

    // Tools reserved for the top ULTIMATE tier.
    private static final List<String> ULTIMATE_TOOL_KEYWORDS =
            List.of("pipeline", "automation", "workflow", "/ai", "ai/", "auto-");

    private final UserRepository userRepository;
    private final PlanDefinitionService planDefinitionService;

    /**
     * The tier the user effectively has right now. A pre-existing/grandfathered account (no tier)
     * is treated as full access; an expired plan drops to the permanent Free tier (e.g. once the
     * Pro trial ends) rather than locking the user out.
     */
    public LicenseTier effectiveTier(User user) {
        if (user == null || user.getLicenseTier() == null || user.getLicenseTier().isBlank()) {
            return LicenseTier.ULTIMATE;
        }
        if (isExpired(user)) {
            return LicenseTier.FREE;
        }
        return LicenseTier.fromString(user.getLicenseTier());
    }

    /** A null expiry means unlimited/grandfathered and never expires. */
    public boolean isExpired(User user) {
        if (user == null) {
            return false;
        }
        LocalDateTime expiry = user.getLicenseExpiresAt();
        return expiry != null && LocalDateTime.now().isAfter(expiry);
    }

    /** Days remaining until expiry, or -1 when the account has no expiry (unlimited). */
    public long daysRemaining(User user) {
        LocalDateTime expiry = user == null ? null : user.getLicenseExpiresAt();
        if (expiry == null) {
            return -1;
        }
        return Duration.between(LocalDateTime.now(), expiry).toDays();
    }

    /**
     * Assigns a tier and resets the expiry to now + the plan's configured duration. A plan with no
     * configured duration (e.g. Free by default) leaves the expiry null, i.e. it never expires.
     */
    @Transactional
    public User assign(User user, LicenseTier tier) {
        user.setLicenseTier(tier.name());
        user.setLicenseExpiresAt(planDefinitionService.computeExpiry(tier));
        return userRepository.save(user);
    }

    /** The minimum tier required to use the tool addressed by the given request path. */
    public LicenseTier requiredTierForPath(String path) {
        String p = path == null ? "" : path.toLowerCase(Locale.ROOT);
        for (String keyword : ULTIMATE_TOOL_KEYWORDS) {
            if (p.contains(keyword)) {
                return LicenseTier.ULTIMATE;
            }
        }
        for (String keyword : FREE_TOOL_KEYWORDS) {
            if (p.contains(keyword)) {
                return LicenseTier.FREE;
            }
        }
        return LicenseTier.PRO;
    }

    /** Whether the user's effective tier is allowed to use the tool at the given path. */
    public boolean isToolAllowed(User user, String path) {
        return effectiveTier(user).covers(requiredTierForPath(path));
    }
}
