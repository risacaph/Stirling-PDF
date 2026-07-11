package stirling.software.proprietary.security.configuration.ee;

import java.io.IOException;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

import lombok.extern.slf4j.Slf4j;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.common.util.GeneralUtils;
import stirling.software.proprietary.security.configuration.ee.KeygenLicenseVerifier.License;
import stirling.software.proprietary.service.UserLicenseSettingsService;

@Slf4j
@Component
public class LicenseKeyChecker {

    private final ApplicationProperties applicationProperties;

    private final UserLicenseSettingsService licenseSettingsService;

    // License limits have been removed: the instance always runs as the top ENTERPRISE tier, so
    // every premium/enterprise capability is unlocked without a license key and without any call
    // to the Keygen service. Pinned here (and re-affirmed by evaluateLicense) so readers via
    // getPremiumLicenseEnabledResult() / requireProOrEnterprise() always see ENTERPRISE.
    private volatile License premiumEnabledResult = License.ENTERPRISE;

    public LicenseKeyChecker(
            ApplicationProperties applicationProperties,
            @Lazy UserLicenseSettingsService licenseSettingsService) {
        this.applicationProperties = applicationProperties;
        this.licenseSettingsService = licenseSettingsService;
    }

    @PostConstruct
    public void init() {
        evaluateLicense();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        synchronizeLicenseSettings();
    }

    @Scheduled(initialDelay = 604800000, fixedRate = 604800000) // 7 days in milliseconds
    public void checkLicensePeriodically() {
        try {
            evaluateLicense();
        } catch (RuntimeException e) {
            log.error(
                    "Periodic license check failed after all retries: {}. Keeping existing license"
                            + " status.",
                    e.getMessage());
        }
        synchronizeLicenseSettings();
    }

    private void evaluateLicense() {
        // License limits removed: always run as ENTERPRISE with premium features enabled, without
        // reading a license key or contacting the Keygen service. Premium is force-enabled so the
        // direct premium.isEnabled() consumers (config/app-config flags, analytics, invites) also
        // report unlocked, and the user cap is set to unlimited.
        premiumEnabledResult = License.ENTERPRISE;
        applicationProperties.getPremium().setEnabled(true);
        applicationProperties.getPremium().setMaxUsers(0);
    }

    private void synchronizeLicenseSettings() {
        licenseSettingsService.updateLicenseMaxUsers();
    }

    public void updateLicenseKey(String newKey) throws IOException {
        applicationProperties.getPremium().setKey(newKey);
        GeneralUtils.saveKeyToSettings("premium.key", newKey);
        evaluateLicense();
        synchronizeLicenseSettings();
    }

    public void resyncLicense() {
        evaluateLicense();
        synchronizeLicenseSettings();
    }

    public License getPremiumLicenseEnabledResult() {
        return premiumEnabledResult;
    }

    /**
     * Throws {@link IllegalStateException} if the current license is not Pro or Enterprise. Used by
     * boot-time gates to fail fast when an operator enables a premium-only setting without a valid
     * license. {@code configuredAs} is the human-readable property path (e.g. {@code
     * "storage.provider=s3"}) and appears in the exception message.
     */
    public void requireProOrEnterprise(String configuredAs) {
        if (premiumEnabledResult != License.SERVER && premiumEnabledResult != License.ENTERPRISE) {
            throw new IllegalStateException(configuredAs + " requires a Pro or Enterprise license");
        }
    }
}
