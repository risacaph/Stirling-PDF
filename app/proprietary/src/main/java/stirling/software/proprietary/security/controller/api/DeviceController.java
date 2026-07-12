package stirling.software.proprietary.security.controller.api;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import stirling.software.proprietary.security.model.User;
import stirling.software.proprietary.security.service.DeviceActivationService;
import stirling.software.proprietary.security.service.UserService;

/**
 * Lets the signed-in user see and remove the devices registered against their account. Removing a
 * device frees a slot toward their plan's device limit (enforced at sign-in by {@link
 * stirling.software.proprietary.security.controller.api.AuthController}).
 */
@RestController
@RequestMapping("/api/v1/user/devices")
@RequiredArgsConstructor
@Tag(name = "Devices", description = "Manage the devices signed in to your account.")
public class DeviceController {

    private final DeviceActivationService deviceActivationService;
    private final UserService userService;

    @GetMapping
    @Operation(
            summary = "List your devices",
            description =
                    "Returns the current user's registered devices and their plan device cap.")
    public ResponseEntity<?> myDevices(
            Principal principal,
            @RequestHeader(value = "X-Browser-Id", required = false) String currentDeviceId) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Optional<User> userOpt = userService.findByUsernameIgnoreCase(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        User user = userOpt.get();
        List<DeviceView> devices =
                deviceActivationService.list(user.getUsername()).stream()
                        .map(
                                d ->
                                        new DeviceView(
                                                d.getId(),
                                                d.getLabel(),
                                                d.getCreatedAt(),
                                                d.getLastSeenAt(),
                                                d.getDeviceId().equals(currentDeviceId)))
                        .toList();
        return ResponseEntity.ok(
                Map.of(
                        "maxDevices",
                        deviceActivationService.maxDevicesFor(user),
                        "devices",
                        devices));
    }

    @DeleteMapping("/{id}")
    @Operation(
            summary = "Remove one of your devices",
            description = "Removes a device you own, freeing a slot toward your device limit.")
    public ResponseEntity<?> revoke(@PathVariable("id") long id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (!deviceActivationService.revoke(principal.getName(), id)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Device not found"));
        }
        return ResponseEntity.ok(Map.of("message", "Device removed"));
    }

    /** Device shown to the user (no username / raw device id leaked). */
    private record DeviceView(
            Long id,
            String label,
            LocalDateTime createdAt,
            LocalDateTime lastSeenAt,
            boolean current) {}
}
