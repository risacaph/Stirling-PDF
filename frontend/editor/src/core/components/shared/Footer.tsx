import { Flex } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useCookieConsent } from "@app/hooks/useCookieConsent";
import { useFooterInfo } from "@app/hooks/useFooterInfo";
import { Button } from "@app/ui/Button";
import { privacyPolicyUrl, termsUrl } from "@app/constants/siteLinks";

interface FooterProps {
  privacyPolicy?: string;
  termsAndConditions?: string;
  accessibilityStatement?: string;
  cookiePolicy?: string;
  impressum?: string;
  analyticsEnabled?: boolean;
}

export default function Footer({
  privacyPolicy,
  termsAndConditions,
  accessibilityStatement,
  cookiePolicy,
  impressum,
  analyticsEnabled,
}: FooterProps) {
  const { t } = useTranslation();
  const { footerInfo } = useFooterInfo();

  // Use props if provided, otherwise fall back to fetched footer info
  const finalAnalyticsEnabled =
    analyticsEnabled ?? footerInfo?.analyticsEnabled ?? false;
  const finalPrivacyPolicy = privacyPolicy ?? footerInfo?.privacyPolicy;
  const finalTermsAndConditions =
    termsAndConditions ?? footerInfo?.termsAndConditions;
  const finalAccessibilityStatement =
    accessibilityStatement ?? footerInfo?.accessibilityStatement;
  const finalCookiePolicy = cookiePolicy ?? footerInfo?.cookiePolicy;
  const finalImpressum = impressum ?? footerInfo?.impressum;

  const { showCookiePreferences } = useCookieConsent({
    analyticsEnabled: finalAnalyticsEnabled,
  });

  // Privacy Policy and Terms link to the bundled Papyra legal pages unless the administrator has
  // configured their own URLs in Settings > Legal. The legacy upstream default (stirling.com) is
  // treated as unset so existing installs that persisted it still get the Papyra pages.
  const isConfiguredLegalUrl = (url?: string) =>
    !!url && url.trim().length > 0 && !/stirling\.com/i.test(url);
  const finalTermsUrl = isConfiguredLegalUrl(finalTermsAndConditions)
    ? finalTermsAndConditions!
    : termsUrl();
  const finalPrivacyUrl = isConfiguredLegalUrl(finalPrivacyPolicy)
    ? finalPrivacyPolicy!
    : privacyPolicyUrl();

  // Helper to check if a value is valid (not null/undefined/empty string)
  const isValidLink = (link?: string) => link && link.trim().length > 0;

  return (
    <div
      style={{
        height: "var(--footer-height)",
        backgroundColor: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Flex
        gap="md"
        justify="center"
        align="center"
        direction="row"
        style={{
          fontSize: "0.75rem",
        }}
      >
        {isValidLink(finalPrivacyUrl) && (
          <a
            className="footer-link px-3"
            target="_blank"
            rel="noopener noreferrer"
            href={finalPrivacyUrl}
          >
            {t("legal.privacy", "Privacy Policy")}
          </a>
        )}
        {isValidLink(finalTermsUrl) && (
          <a
            className="footer-link px-3"
            target="_blank"
            rel="noopener noreferrer"
            href={finalTermsUrl}
          >
            {t("legal.terms", "Terms and Conditions")}
          </a>
        )}
        {isValidLink(finalAccessibilityStatement) && (
          <a
            className="footer-link px-3"
            target="_blank"
            rel="noopener noreferrer"
            href={finalAccessibilityStatement}
          >
            {t("legal.accessibility", "Accessibility")}
          </a>
        )}
        {isValidLink(finalCookiePolicy) && (
          <a
            className="footer-link px-3"
            target="_blank"
            rel="noopener noreferrer"
            href={finalCookiePolicy}
          >
            {t("legal.cookie", "Cookie Policy")}
          </a>
        )}
        {isValidLink(finalImpressum) && (
          <a
            className="footer-link px-3"
            target="_blank"
            rel="noopener noreferrer"
            href={finalImpressum}
          >
            {t("legal.impressum", "Impressum")}
          </a>
        )}
        {finalAnalyticsEnabled && (
          <Button
            variant="tertiary"
            className="footer-link px-3"
            id="cookieBanner"
            onClick={showCookiePreferences}
          >
            {t("legal.showCookieBanner", "Cookie Preferences")}
          </Button>
        )}
      </Flex>
    </div>
  );
}
