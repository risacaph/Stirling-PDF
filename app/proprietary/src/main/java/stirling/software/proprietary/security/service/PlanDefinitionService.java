package stirling.software.proprietary.security.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import stirling.software.proprietary.security.model.LicenseTier;
import stirling.software.proprietary.security.model.PlanDefinition;
import stirling.software.proprietary.security.repository.PlanDefinitionRepository;

/**
 * Source of truth for the admin-editable {@link PlanDefinition} of each {@link LicenseTier}.
 *
 * <p>Durations and device caps used to be hardcoded on the enum; this service stores them in the
 * database instead so an administrator can change a plan's title, length, and device cap at
 * runtime. Missing rows are seeded lazily with sensible defaults — importantly the Free tier
 * defaults to no expiry, so free accounts never lapse.
 */
@Service
@RequiredArgsConstructor
public class PlanDefinitionService {

    private static final int MAX_DURATION_MONTHS = 1200; // 100 years
    private static final int MAX_DEVICES = 100;
    private static final int MAX_TITLE_LENGTH = 60;

    private final PlanDefinitionRepository planDefinitionRepository;

    /** All plans, ordered by tier rank (Free, Pro, Ultimate), seeding any missing defaults. */
    @Transactional
    public List<PlanDefinition> getPlans() {
        ensureDefaults();
        List<PlanDefinition> plans = new ArrayList<>();
        for (LicenseTier tier : LicenseTier.values()) {
            plans.add(getPlan(tier));
        }
        return plans;
    }

    /** The plan for a tier, creating it from defaults if it does not exist yet. */
    @Transactional
    public PlanDefinition getPlan(LicenseTier tier) {
        return planDefinitionRepository
                .findById(tier.name())
                .orElseGet(() -> planDefinitionRepository.save(defaultFor(tier)));
    }

    /** Configured duration in months for a tier, or {@code null} when the plan never expires. */
    @Transactional
    public Integer durationMonthsFor(LicenseTier tier) {
        return getPlan(tier).getDurationMonths();
    }

    /**
     * Absolute expiry for a tier assigned now: {@code now + durationMonths}, or {@code null} when
     * the plan never expires.
     */
    @Transactional
    public LocalDateTime computeExpiry(LicenseTier tier) {
        Integer months = durationMonthsFor(tier);
        return months == null ? null : LocalDateTime.now().plusMonths(months);
    }

    /**
     * Updates an editable plan. A {@code null} {@code durationMonths} makes the plan never expire.
     *
     * @throws IllegalArgumentException if the title is blank or the numeric values are out of range
     */
    @Transactional
    public PlanDefinition updatePlan(
            LicenseTier tier, String title, Integer durationMonths, int maxDevices) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Plan title must not be blank");
        }
        if (title.length() > MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException(
                    "Plan title must be at most " + MAX_TITLE_LENGTH + " characters");
        }
        if (durationMonths != null
                && (durationMonths < 1 || durationMonths > MAX_DURATION_MONTHS)) {
            throw new IllegalArgumentException(
                    "Duration must be between 1 and " + MAX_DURATION_MONTHS + " months, or empty");
        }
        if (maxDevices < 1 || maxDevices > MAX_DEVICES) {
            throw new IllegalArgumentException("Max devices must be between 1 and " + MAX_DEVICES);
        }
        PlanDefinition plan = getPlan(tier);
        plan.setTitle(title.trim());
        plan.setDurationMonths(durationMonths);
        plan.setMaxDevices(maxDevices);
        return planDefinitionRepository.save(plan);
    }

    private void ensureDefaults() {
        if (planDefinitionRepository.count() >= LicenseTier.values().length) {
            return;
        }
        for (LicenseTier tier : LicenseTier.values()) {
            if (!planDefinitionRepository.existsById(tier.name())) {
                planDefinitionRepository.save(defaultFor(tier));
            }
        }
    }

    private static PlanDefinition defaultFor(LicenseTier tier) {
        return switch (tier) {
            case FREE -> new PlanDefinition(tier.name(), "Free", null, 1);
            case PRO -> new PlanDefinition(tier.name(), "Pro", 12, 3);
            case ULTIMATE -> new PlanDefinition(tier.name(), "Ultimate", 60, 10);
        };
    }
}
