package stirling.software.proprietary.security.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import stirling.software.common.model.ApplicationProperties;

/**
 * Verifies Cloudflare Turnstile response tokens server-side.
 *
 * <p>Fails CLOSED: a missing/invalid token, a non-200 response, or any network/parse error is
 * treated as a failed verification, so an attacker cannot bypass the check by making Cloudflare
 * unreachable.
 */
@Service
@Slf4j
public class TurnstileVerificationService {

    private static final String SITEVERIFY_URL =
            "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private final ApplicationProperties applicationProperties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public TurnstileVerificationService(ApplicationProperties applicationProperties) {
        this(
                applicationProperties,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
    }

    /** Package-private: lets tests inject a stub {@link HttpClient}. */
    TurnstileVerificationService(
            ApplicationProperties applicationProperties, HttpClient httpClient) {
        this.applicationProperties = applicationProperties;
        this.httpClient = httpClient;
    }

    private ApplicationProperties.Security.Turnstile config() {
        return applicationProperties.getSecurity().getTurnstile();
    }

    /** True when Turnstile is enabled and a secret key is configured. */
    public boolean isEnabled() {
        ApplicationProperties.Security.Turnstile t = config();
        return t != null
                && t.isEnabled()
                && t.getSecretKey() != null
                && !t.getSecretKey().isBlank();
    }

    /**
     * Verify a Turnstile response token with Cloudflare.
     *
     * @param token the {@code cf-turnstile-response} token from the widget
     * @param remoteIp the client IP (optional, may be null)
     * @return true only when Cloudflare confirms the token is valid
     */
    public boolean verify(String token, String remoteIp) {
        if (token == null || token.isBlank()) {
            log.warn("Turnstile verification failed: no token provided");
            return false;
        }
        String secret = config().getSecretKey();
        if (secret == null || secret.isBlank()) {
            log.warn("Turnstile verification failed: no secret key configured");
            return false;
        }
        try {
            StringBuilder form = new StringBuilder();
            form.append("secret=").append(encode(secret));
            form.append("&response=").append(encode(token));
            if (remoteIp != null && !remoteIp.isBlank()) {
                form.append("&remoteip=").append(encode(remoteIp));
            }
            HttpRequest req =
                    HttpRequest.newBuilder()
                            .uri(URI.create(SITEVERIFY_URL))
                            .timeout(Duration.ofSeconds(8))
                            .header("Content-Type", "application/x-www-form-urlencoded")
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            form.toString(), StandardCharsets.UTF_8))
                            .build();
            HttpResponse<String> resp =
                    httpClient.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() != 200) {
                log.warn("Turnstile siteverify returned HTTP {}", resp.statusCode());
                return false;
            }
            JsonNode node = objectMapper.readTree(resp.body());
            boolean success = node.path("success").asBoolean(false);
            if (!success) {
                log.warn("Turnstile verification rejected: {}", node.path("error-codes"));
            }
            return success;
        } catch (Exception e) {
            // Fail closed on any network/parse error.
            log.warn("Turnstile verification error (failing closed): {}", e.getMessage());
            return false;
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
