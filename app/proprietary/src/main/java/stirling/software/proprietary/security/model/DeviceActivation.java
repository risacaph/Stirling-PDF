package stirling.software.proprietary.security.model;

import java.io.Serializable;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A device a user has signed in from. Used to enforce the per-plan device limit: each distinct
 * {@code deviceId} (the browser's stable X-Browser-Id) for a user is one row, and a login from a
 * new device is refused once the user already has as many rows as their plan allows.
 */
@Entity
@Table(
        name = "device_activations",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_device_activation_user_device",
                        columnNames = {"username", "device_id"}))
@NoArgsConstructor
@Getter
@Setter
public class DeviceActivation implements Serializable {

    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "username", nullable = false)
    private String username;

    /** Stable per-browser/device identifier (the X-Browser-Id header value). */
    @Column(name = "device_id", nullable = false, length = 128)
    private String deviceId;

    /** Human-friendly label for the device, derived from the User-Agent at first sign-in. */
    @Column(name = "label", length = 256)
    private String label;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;
}
