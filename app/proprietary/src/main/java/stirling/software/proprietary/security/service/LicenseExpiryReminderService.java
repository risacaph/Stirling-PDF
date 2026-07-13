package stirling.software.proprietary.security.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.MessagingException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.proprietary.security.database.repository.UserRepository;
import stirling.software.proprietary.security.model.User;

/**
 * Daily sweep that emails users whose admin-managed access plan is about to lapse, so they can
 * renew before losing access. Never-expiring accounts (null expiry) are excluded, and each user is
 * reminded at most once per grant cycle (tracked by {@code User.licenseExpiryReminderSentAt}, which
 * {@link UserLicenseAccessService} clears on every new grant). The whole job is a no-op when no
 * mail sender is configured.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LicenseExpiryReminderService {

    // Remind users this many days before their plan lapses.
    private static final int REMINDER_THRESHOLD_DAYS = 7;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final UserRepository userRepository;
    private final Optional<EmailService> emailService;
    private final UserLicenseAccessService licenseAccessService;
    private final ApplicationProperties applicationProperties;

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void sendExpiryReminders() {
        if (emailService.isEmpty()) {
            return;
        }
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime windowEnd = now.plusDays(REMINDER_THRESHOLD_DAYS);
            List<User> due =
                    userRepository
                            .findByLicenseExpiresAtIsNotNullAndLicenseExpiresAtBetweenAndLicenseExpiryReminderSentAtIsNull(
                                    now, windowEnd);
            if (due.isEmpty()) {
                return;
            }

            String loginUrl = resolveLoginUrl();
            for (User user : due) {
                String email = user.getEmail();
                if (email == null || email.isBlank()) {
                    continue;
                }
                LocalDateTime expiry = user.getLicenseExpiresAt();
                long daysRemaining = Math.max(0, Duration.between(now, expiry).toDays());
                String tierTitle = licenseAccessService.effectiveTier(user).name();
                try {
                    emailService
                            .get()
                            .sendLicenseExpiryReminderEmail(
                                    email,
                                    tierTitle,
                                    expiry.format(DATE_FORMAT),
                                    daysRemaining,
                                    loginUrl);
                    user.setLicenseExpiryReminderSentAt(now);
                    userRepository.save(user);
                } catch (MessagingException e) {
                    log.warn("Failed to send license expiry reminder to {}", email, e);
                }
            }
        } catch (Exception e) {
            log.error("License expiry reminder sweep failed", e);
        }
    }

    /**
     * Sign-in URL for the email CTA: configured frontend URL, then backend URL, then a bare path.
     */
    private String resolveLoginUrl() {
        String frontendUrl = applicationProperties.getSystem().getFrontendUrl();
        String backendUrl = applicationProperties.getSystem().getBackendUrl();
        String baseUrl;
        if (frontendUrl != null && !frontendUrl.trim().isEmpty()) {
            baseUrl = frontendUrl.trim();
        } else if (backendUrl != null && !backendUrl.trim().isEmpty()) {
            baseUrl = backendUrl.trim();
        } else {
            return "/login";
        }
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl + "/login";
    }
}
