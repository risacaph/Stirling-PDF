package stirling.software.proprietary.security.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import stirling.software.common.model.ApplicationProperties;
import stirling.software.proprietary.security.model.api.Email;

/**
 * Service class responsible for sending emails, including those with attachments. It uses
 * JavaMailSender to send the email and is designed to handle both the message content and file
 * attachments.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(value = "mail.enabled", havingValue = "true", matchIfMissing = false)
public class EmailService {

    private final JavaMailSender mailSender;
    private final ApplicationProperties applicationProperties;

    /**
     * Sends an email with an attachment asynchronously. This method is annotated with @Async, which
     * means it will be executed asynchronously.
     *
     * @param email The Email object containing the recipient, subject, body, and file attachment.
     * @throws MessagingException If there is an issue with creating or sending the email.
     */
    @Async
    public void sendEmailWithAttachment(Email email) throws MessagingException {
        MultipartFile file = email.getFileInput();
        // 1) Validate recipient email address
        if (email.getTo() == null || email.getTo().trim().isEmpty()) {
            throw new MessagingException("Invalid Addresses");
        }

        // 2) Validate attachment
        if (file == null
                || file.isEmpty()
                || file.getOriginalFilename() == null
                || file.getOriginalFilename().isEmpty()) {
            throw new MessagingException("An attachment is required to send the email.");
        }

        ApplicationProperties.Mail mailProperties = applicationProperties.getMail();

        // Creates a MimeMessage to represent the email
        MimeMessage message = mailSender.createMimeMessage();

        // Helper class to set up the message content and attachments
        MimeMessageHelper helper = new MimeMessageHelper(message, true);

        // Sets the recipient, subject, body, and sender email
        helper.addTo(email.getTo());
        helper.setSubject(email.getSubject());
        helper.setText(
                email.getBody(),
                true); // The "true" here indicates that the body contains HTML content.
        helper.setFrom(mailProperties.getFrom());

        // Adds the attachment to the email
        helper.addAttachment(file.getOriginalFilename(), file);

        // Sends the email via the configured mail sender
        mailSender.send(message);
        log.debug(
                "Email sent successfully to {} with subject: {} body: {}",
                email.getTo(),
                email.getSubject(),
                email.getBody());
    }

    /**
     * Sends a simple email without attachments asynchronously.
     *
     * @param to the recipient address
     * @param subject subject line
     * @param body message body
     * @throws MessagingException if sending fails or address is invalid
     */
    @Async
    public void sendSimpleMail(String to, String subject, String body) throws MessagingException {
        if (to == null || to.trim().isEmpty()) {
            throw new MessagingException("Invalid Addresses");
        }

        ApplicationProperties.Mail mailProperties = applicationProperties.getMail();
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false);
        helper.addTo(to);
        helper.setSubject(subject);
        helper.setText(body, false);
        helper.setFrom(mailProperties.getFrom());
        mailSender.send(message);
        log.debug(
                "Simple email sent successfully to {} with subject: {} body: {}",
                to,
                subject,
                body);
    }

    /**
     * Sends a plain text/HTML email without attachments asynchronously.
     *
     * @param to The recipient email address
     * @param subject The email subject
     * @param body The email body (can contain HTML)
     * @param isHtml Whether the body contains HTML content
     * @throws MessagingException If there is an issue with creating or sending the email.
     */
    @Async
    public void sendPlainEmail(String to, String subject, String body, boolean isHtml)
            throws MessagingException {
        // Validate recipient email address
        if (to == null || to.trim().isEmpty()) {
            throw new MessagingException("Invalid recipient email address");
        }

        ApplicationProperties.Mail mailProperties = applicationProperties.getMail();

        // Creates a MimeMessage to represent the email
        MimeMessage message = mailSender.createMimeMessage();

        // Helper class to set up the message content
        MimeMessageHelper helper = new MimeMessageHelper(message, false);

        // Sets the recipient, subject, body, and sender email
        helper.addTo(to);
        helper.setSubject(subject);
        helper.setText(body, isHtml);
        helper.setFrom(mailProperties.getFrom());

        // Sends the email via the configured mail sender
        mailSender.send(message);
    }

    /**
     * Sends an invitation email to a new user with their credentials.
     *
     * @param to The recipient email address
     * @param username The username for the new account
     * @param temporaryPassword The temporary password
     * @param loginUrl The URL to the login page
     * @throws MessagingException If there is an issue with creating or sending the email.
     */
    @Async
    public void sendInviteEmail(
            String to, String username, String temporaryPassword, String loginUrl)
            throws MessagingException {
        String subject = "Welcome to Papyra";

        String body =
                """
                <html><body style="margin: 0; padding: 0;">
                <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
                  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
                    <!-- Logo -->
                    <div style="text-align: center; padding: 20px; background-color: #17252A;">
                      <span style="font-family: Arial, sans-serif; font-size: 30px; font-weight: bold; color: #3AAFA9; letter-spacing: 0.5px;">Papyra</span>
                    </div>
                    <!-- Content -->
                    <div style="padding: 30px; color: #333;">
                      <h2 style="color: #17252A; margin-top: 0;">Welcome to Papyra!</h2>
                      <p>Hi there,</p>
                      <p>You have been invited to join the workspace. Below are your login credentials:</p>
                      <!-- Credentials Box -->
                      <div style="background-color: #f8f9fa; border-left: 4px solid #3AAFA9; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0 0 10px 0;"><strong>Username:</strong> %s</p>
                        <p style="margin: 0;"><strong>Temporary Password:</strong> %s</p>
                      </div>
                      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> You will be required to change your password upon first login for security reasons.</p>
                      </div>
                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="display: inline-block; background-color: #3AAFA9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold;">Log In to Papyra</a>
                      </div>
                      <p style="font-size: 14px; color: #666;">Or copy and paste this link in your browser:</p>
                      <div style="background-color: #f8f9fa; padding: 12px; margin: 15px 0; border-radius: 4px; word-break: break-all; font-size: 13px; color: #555;">
                        %s
                      </div>
                      <p>Please keep these credentials secure and do not share them with anyone.</p>
                      <p style="margin-bottom: 0;">— The Papyra Team</p>
                    </div>
                    <!-- Footer -->
                    <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; background-color: #f0f0f0;">
                      &copy; Papyra. All rights reserved.
                    </div>
                  </div>
                </div>
                </body></html>
                """
                        .formatted(username, temporaryPassword, loginUrl, loginUrl);

        sendPlainEmail(to, subject, body, true);
    }

    /**
     * Sends an invitation link email to a new user.
     *
     * @param to The recipient email address
     * @param inviteUrl The full URL for accepting the invite
     * @param expiresAt The expiration timestamp
     * @throws MessagingException If there is an issue with creating or sending the email.
     */
    @Async
    public void sendInviteLinkEmail(String to, String inviteUrl, String expiresAt)
            throws MessagingException {
        String subject = "You've been invited to Papyra";

        String body =
                """
                <html><body style="margin: 0; padding: 0;">
                <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
                  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
                    <!-- Logo -->
                    <div style="text-align: center; padding: 20px; background-color: #17252A;">
                      <span style="font-family: Arial, sans-serif; font-size: 30px; font-weight: bold; color: #3AAFA9; letter-spacing: 0.5px;">Papyra</span>
                    </div>
                    <!-- Content -->
                    <div style="padding: 30px; color: #333;">
                      <h2 style="color: #17252A; margin-top: 0;">Welcome to Papyra!</h2>
                      <p>Hi there,</p>
                      <p>You have been invited to join the Papyra workspace. Click the button below to set up your account:</p>
                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="display: inline-block; background-color: #3AAFA9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
                      </div>
                      <p style="font-size: 14px; color: #666;">Or copy and paste this link in your browser:</p>
                      <div style="background-color: #f8f9fa; padding: 12px; margin: 15px 0; border-radius: 4px; word-break: break-all; font-size: 13px; color: #555;">
                        %s
                      </div>
                      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #856404; font-size: 14px;"><strong>⚠️ Important:</strong> This invitation link will expire on %s. Please complete your registration before then.</p>
                      </div>
                      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                      <p style="margin-bottom: 0;">— The Papyra Team</p>
                    </div>
                    <!-- Footer -->
                    <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; background-color: #f0f0f0;">
                      &copy; Papyra. All rights reserved.
                    </div>
                  </div>
                </div>
                </body></html>
                """
                        .formatted(inviteUrl, inviteUrl, expiresAt);

        sendPlainEmail(to, subject, body, true);
    }

    /**
     * Sends a self-service password reset link email.
     *
     * @param to The recipient email address
     * @param resetUrl The full URL for setting a new password
     * @param expiresAt The expiration timestamp
     * @throws MessagingException If there is an issue with creating or sending the email.
     */
    @Async
    public void sendPasswordResetEmail(String to, String resetUrl, String expiresAt)
            throws MessagingException {
        String subject = "Reset your Papyra password";

        String body =
                """
                <html><body style="margin: 0; padding: 0;">
                <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
                  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
                    <!-- Logo -->
                    <div style="text-align: center; padding: 20px; background-color: #17252A;">
                      <span style="font-family: Arial, sans-serif; font-size: 30px; font-weight: bold; color: #3AAFA9; letter-spacing: 0.5px;">Papyra</span>
                    </div>
                    <!-- Content -->
                    <div style="padding: 30px; color: #333;">
                      <h2 style="color: #17252A; margin-top: 0;">Reset your password</h2>
                      <p>Hi there,</p>
                      <p>We received a request to reset the password for your Papyra account. Click the button below to choose a new password:</p>
                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="display: inline-block; background-color: #3AAFA9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset password</a>
                      </div>
                      <p style="font-size: 14px; color: #666;">Or copy and paste this link in your browser:</p>
                      <div style="background-color: #f8f9fa; padding: 12px; margin: 15px 0; border-radius: 4px; word-break: break-all; font-size: 13px; color: #555;">
                        %s
                      </div>
                      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #856404; font-size: 14px;"><strong>⚠️ Important:</strong> This reset link will expire on %s. If it expires, request a new one from the login page.</p>
                      </div>
                      <p>If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
                      <p style="margin-bottom: 0;">— The Papyra Team</p>
                    </div>
                    <!-- Footer -->
                    <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; background-color: #f0f0f0;">
                      &copy; Papyra. All rights reserved.
                    </div>
                  </div>
                </div>
                </body></html>
                """
                        .formatted(resetUrl, resetUrl, expiresAt);

        sendPlainEmail(to, subject, body, true);
    }

    /**
     * Sends a reminder that the user's access plan is about to expire.
     *
     * @param to The recipient email address
     * @param tierTitle The name of the plan that is expiring
     * @param expiresAt The expiry date
     * @param daysRemaining Whole days until expiry
     * @param loginUrl The sign-in URL
     * @throws MessagingException If there is an issue with creating or sending the email.
     */
    @Async
    public void sendLicenseExpiryReminderEmail(
            String to, String tierTitle, String expiresAt, long daysRemaining, String loginUrl)
            throws MessagingException {
        String subject = "Your Papyra plan is expiring soon";

        String body =
                """
                <html><body style="margin: 0; padding: 0;">
                <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
                  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
                    <!-- Logo -->
                    <div style="text-align: center; padding: 20px; background-color: #17252A;">
                      <span style="font-family: Arial, sans-serif; font-size: 30px; font-weight: bold; color: #3AAFA9; letter-spacing: 0.5px;">Papyra</span>
                    </div>
                    <!-- Content -->
                    <div style="padding: 30px; color: #333;">
                      <h2 style="color: #17252A; margin-top: 0;">Your plan is expiring soon</h2>
                      <p>Hi there,</p>
                      <p>This is a friendly reminder that your Papyra <strong>%s</strong> plan is about to expire.</p>
                      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #856404; font-size: 14px;"><strong>⚠️ Expires on %s</strong> — that's %s day(s) from now. After it lapses your account moves to the Free plan.</p>
                      </div>
                      <p>Contact your administrator to renew or upgrade your access.</p>
                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="%s" style="display: inline-block; background-color: #3AAFA9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold;">Sign in</a>
                      </div>
                      <p style="font-size: 14px; color: #666;">Or copy and paste this link in your browser:</p>
                      <div style="background-color: #f8f9fa; padding: 12px; margin: 15px 0; border-radius: 4px; word-break: break-all; font-size: 13px; color: #555;">
                        %s
                      </div>
                      <p style="margin-bottom: 0;">— The Papyra Team</p>
                    </div>
                    <!-- Footer -->
                    <div style="text-align: center; padding: 15px; font-size: 12px; color: #777; background-color: #f0f0f0;">
                      &copy; Papyra. All rights reserved.
                    </div>
                  </div>
                </div>
                </body></html>
                """
                        .formatted(tierTitle, expiresAt, daysRemaining, loginUrl, loginUrl);

        sendPlainEmail(to, subject, body, true);
    }

    @Async
    public void sendPasswordChangedNotification(
            String to, String username, String newPassword, String loginUrl)
            throws MessagingException {
        String subject = "Your Papyra password has been updated";

        String passwordSection =
                newPassword == null
                        ? ""
                        : """
                          <div style=\"background-color: #f8f9fa; border-left: 4px solid #3AAFA9; padding: 15px; margin: 20px 0; border-radius: 4px;\">
                            <p style=\"margin: 0;\"><strong>Temporary Password:</strong> %s</p>
                          </div>
                        """
                                .formatted(newPassword);

        String body =
                """
                <html><body style=\"margin: 0; padding: 0;\">
                <div style=\"font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;\">
                  <div style=\"max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;\">
                    <div style=\"text-align: center; padding: 20px; background-color: #17252A;\">
                      <span style=\"font-family: Arial, sans-serif; font-size: 30px; font-weight: bold; color: #3AAFA9; letter-spacing: 0.5px;\">Papyra</span>
                    </div>
                    <div style=\"padding: 30px; color: #333;\">
                      <h2 style=\"color: #17252A; margin-top: 0;\">Your password was changed</h2>
                      <p>Hello %s,</p>
                      <p>An administrator has updated the password for your Papyra account.</p>
                      %s
                      <p>If you did not expect this change, please contact your administrator immediately.</p>
                      <div style=\"text-align: center; margin: 30px 0;\">
                        <a href=\"%s\" style=\"display: inline-block; background-color: #3AAFA9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold;\">Go to Papyra</a>
                      </div>
                      <p style=\"font-size: 14px; color: #666;\">Or copy and paste this link in your browser:</p>
                      <div style=\"background-color: #f8f9fa; padding: 12px; margin: 15px 0; border-radius: 4px; word-break: break-all; font-size: 13px; color: #555;\">
                        %s
                      </div>
                    </div>
                    <div style=\"text-align: center; padding: 15px; font-size: 12px; color: #777; background-color: #f0f0f0;\">
                      &copy; Papyra. All rights reserved.
                    </div>
                  </div>
                </div>
                </body></html>
                """
                        .formatted(username, passwordSection, loginUrl, loginUrl);

        sendPlainEmail(to, subject, body, true);
    }
}
