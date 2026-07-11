package stirling.software.proprietary.security.config;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import stirling.software.common.model.enumeration.Role;
import stirling.software.proprietary.security.model.LicenseTier;
import stirling.software.proprietary.security.model.User;
import stirling.software.proprietary.security.service.UserLicenseAccessService;
import stirling.software.proprietary.security.service.UserService;

/**
 * Enforces the admin-managed per-user access license on tool operations:
 *
 * <ul>
 *   <li>expired users are read-only — mutating tool calls are blocked (403);
 *   <li>tools above the user's tier are blocked (403).
 * </ul>
 *
 * <p>Only mutating requests ({@code POST/PUT/PATCH/DELETE}) to tool endpoints under {@code
 * /api/v1/} are gated. Account/config/admin/auth/info endpoints, admins, internal API accounts and
 * unauthenticated requests are all skipped (the last is left to Spring Security).
 */
@Component
@RequiredArgsConstructor
public class UserLicenseInterceptor implements HandlerInterceptor {

    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    // /api/v1 paths that are never gated (auth, account, config, admin management, info, teams).
    private static final List<String> SKIP_PREFIXES =
            List.of(
                    "/api/v1/user",
                    "/api/v1/config",
                    "/api/v1/admin",
                    "/api/v1/auth",
                    "/api/v1/info",
                    "/api/v1/settings",
                    "/api/v1/teams");

    private final UserService userService;
    private final UserLicenseAccessService licenseAccessService;

    @Override
    public boolean preHandle(
            HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        String path = request.getRequestURI();
        String method =
                request.getMethod() == null ? "" : request.getMethod().toUpperCase(Locale.ROOT);

        if (path == null || !path.startsWith("/api/v1/") || !MUTATING_METHODS.contains(method)) {
            return true;
        }
        for (String prefix : SKIP_PREFIXES) {
            if (path.startsWith(prefix)) {
                return true;
            }
        }

        // Admins are always exempt.
        if (userService.isCurrentUserAdmin()) {
            return true;
        }

        String username = userService.getCurrentUsername();
        if (username == null || username.isBlank()) {
            return true; // unauthenticated — let Spring Security handle it
        }
        Optional<User> userOpt = userService.findByUsernameIgnoreCase(username);
        if (userOpt.isEmpty()) {
            return true;
        }
        User user = userOpt.get();

        // Internal/service API accounts are exempt.
        String roles = user.getRolesAsString();
        if (roles != null && roles.contains(Role.INTERNAL_API_USER.getRoleId())) {
            return true;
        }

        if (licenseAccessService.isExpired(user)) {
            deny(
                    response,
                    "license_expired",
                    "Your access has expired and the app is read-only. Contact your administrator"
                            + " to renew.");
            return false;
        }
        if (!licenseAccessService.isToolAllowed(user, path)) {
            LicenseTier required = licenseAccessService.requiredTierForPath(path);
            deny(
                    response,
                    "license_tier",
                    "This tool requires the "
                            + required.name()
                            + " plan. Contact your administrator to upgrade.");
            return false;
        }
        return true;
    }

    private void deny(HttpServletResponse response, String error, String message) throws Exception {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        String body =
                "{\"error\":\""
                        + error
                        + "\",\"message\":\""
                        + message.replace("\"", "\\\"")
                        + "\"}";
        response.getWriter().write(body);
    }
}
