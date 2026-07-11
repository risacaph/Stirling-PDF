package stirling.software.proprietary.security.configuration.ee;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static stirling.software.proprietary.security.configuration.ee.KeygenLicenseVerifier.License;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.proprietary.service.UserLicenseSettingsService;

/**
 * License limits have been removed: the checker always reports the top ENTERPRISE tier and
 * force-enables premium, regardless of any configured key or the {@code premium.enabled} flag, and
 * never contacts the Keygen service.
 */
@ExtendWith(MockitoExtension.class)
class LicenseKeyCheckerTest {

    @Mock private UserLicenseSettingsService userLicenseSettingsService;

    @Test
    void alwaysEnterprise_regardlessOfConfiguredKeyOrEnabledFlag() {
        ApplicationProperties props = new ApplicationProperties();
        props.getPremium().setEnabled(false);
        props.getPremium().setKey("anything");

        LicenseKeyChecker checker = new LicenseKeyChecker(props, userLicenseSettingsService);
        checker.init();

        assertThat(checker.getPremiumLicenseEnabledResult()).isEqualTo(License.ENTERPRISE);
        // Premium is force-enabled and users are unlimited (maxUsers=0 => unlimited).
        assertThat(props.getPremium().isEnabled()).isTrue();
        assertThat(props.getPremium().getMaxUsers()).isZero();
    }

    @Test
    void enterpriseBeforeInit_fromPinnedDefault() {
        ApplicationProperties props = new ApplicationProperties();
        LicenseKeyChecker checker = new LicenseKeyChecker(props, userLicenseSettingsService);

        // Even before init() runs, the pinned default tier is ENTERPRISE.
        assertThat(checker.getPremiumLicenseEnabledResult()).isEqualTo(License.ENTERPRISE);
    }

    @Test
    void requireProOrEnterprise_neverThrows() {
        ApplicationProperties props = new ApplicationProperties();
        LicenseKeyChecker checker = new LicenseKeyChecker(props, userLicenseSettingsService);
        checker.init();

        assertThatCode(() -> checker.requireProOrEnterprise("storage.provider=s3"))
                .doesNotThrowAnyException();
    }
}
