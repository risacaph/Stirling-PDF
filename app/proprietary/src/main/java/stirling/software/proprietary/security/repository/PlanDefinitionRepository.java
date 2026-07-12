package stirling.software.proprietary.security.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import stirling.software.proprietary.security.model.PlanDefinition;

/** Persistence for admin-editable {@link PlanDefinition} rows, keyed by tier name. */
@Repository
public interface PlanDefinitionRepository extends JpaRepository<PlanDefinition, String> {}
