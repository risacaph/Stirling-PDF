package stirling.software.proprietary.security.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import stirling.software.common.model.enumeration.Role;
import stirling.software.proprietary.security.model.DeviceActivation;
import stirling.software.proprietary.security.model.User;
import stirling.software.proprietary.security.repository.DeviceActivationRepository;

/**
 * Tracks the devices each user has signed in from and enforces the per-plan device limit.
 *
 * <p>The device identity is the browser's stable {@code X-Browser-Id}. Admins and internal API
 * accounts, and clients that send no device id (e.g. some desktop flows), are exempt so they are
 * never locked out. The cap comes from the user's effective plan's {@code maxDevices}.
 */
@Service
@RequiredArgsConstructor
public class DeviceActivationService {

    private static final int LABEL_MAX_LENGTH = 256;

    private final DeviceActivationRepository deviceActivationRepository;
    private final UserLicenseAccessService licenseAccessService;
    private final PlanDefinitionService planDefinitionService;

    /** Maximum devices allowed for the user's effective (post-expiry) plan tier. */
    public int maxDevicesFor(User user) {
        return planDefinitionService
                .getPlan(licenseAccessService.effectiveTier(user))
                .getMaxDevices();
    }

    private boolean isExempt(User user) {
        String roles = user.getRolesAsString();
        return roles != null
                && (roles.contains(Role.ADMIN.getRoleId())
                        || roles.contains(Role.INTERNAL_API_USER.getRoleId()));
    }

    /**
     * Records this device for the user at sign-in, or returns {@code false} when registering a new
     * device would exceed the plan's limit. A known device (or an exempt account / missing device
     * id) is always allowed and its last-seen timestamp is refreshed.
     */
    @Transactional
    public boolean registerOrReject(User user, String deviceId, String rawLabel) {
        if (user == null || deviceId == null || deviceId.isBlank() || isExempt(user)) {
            return true;
        }
        String username = user.getUsername();
        String label = truncateLabel(rawLabel);
        LocalDateTime now = LocalDateTime.now();

        Optional<DeviceActivation> existing =
                deviceActivationRepository.findByUsernameAndDeviceId(username, deviceId);
        if (existing.isPresent()) {
            DeviceActivation device = existing.get();
            device.setLastSeenAt(now);
            if (label != null && !label.isBlank()) {
                device.setLabel(label);
            }
            deviceActivationRepository.save(device);
            return true;
        }

        if (deviceActivationRepository.countByUsername(username) >= maxDevicesFor(user)) {
            return false;
        }

        DeviceActivation device = new DeviceActivation();
        device.setUsername(username);
        device.setDeviceId(deviceId);
        device.setLabel(label);
        device.setCreatedAt(now);
        device.setLastSeenAt(now);
        deviceActivationRepository.save(device);
        return true;
    }

    /** Devices registered for a user, most recently seen first. */
    public List<DeviceActivation> list(String username) {
        return deviceActivationRepository.findByUsernameOrderByLastSeenAtDesc(username);
    }

    /** Removes a device the user owns, freeing a slot. Returns whether a row was removed. */
    @Transactional
    public boolean revoke(String username, long id) {
        Optional<DeviceActivation> device = deviceActivationRepository.findById(id);
        if (device.isPresent() && username.equals(device.get().getUsername())) {
            deviceActivationRepository.delete(device.get());
            return true;
        }
        return false;
    }

    private static String truncateLabel(String rawLabel) {
        if (rawLabel == null) {
            return null;
        }
        String trimmed = rawLabel.trim();
        return trimmed.length() > LABEL_MAX_LENGTH
                ? trimmed.substring(0, LABEL_MAX_LENGTH)
                : trimmed;
    }
}
