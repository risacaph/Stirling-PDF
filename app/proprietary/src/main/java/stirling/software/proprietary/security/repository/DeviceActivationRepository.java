package stirling.software.proprietary.security.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import stirling.software.proprietary.security.model.DeviceActivation;

/** Persistence for per-user {@link DeviceActivation} rows used to enforce the device limit. */
@Repository
public interface DeviceActivationRepository extends JpaRepository<DeviceActivation, Long> {

    Optional<DeviceActivation> findByUsernameAndDeviceId(String username, String deviceId);

    long countByUsername(String username);

    List<DeviceActivation> findByUsernameOrderByLastSeenAtDesc(String username);
}
