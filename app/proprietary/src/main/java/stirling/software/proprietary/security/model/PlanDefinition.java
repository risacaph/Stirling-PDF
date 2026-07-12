package stirling.software.proprietary.security.model;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Admin-editable definition of an access plan. One row per {@link LicenseTier}, keyed by the tier
 * name. Lets an administrator rename a plan, change how long it lasts, and cap how many devices a
 * user on that plan may activate — without a code change.
 *
 * <p>A {@code null} {@link #durationMonths} means the plan never expires (used for the Free tier by
 * default, so free accounts do not lapse).
 */
@Entity
@Table(name = "plan_definitions")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@ToString
public class PlanDefinition implements Serializable {

    private static final long serialVersionUID = 1L;

    /** Natural key: the {@link LicenseTier} name (FREE / PRO / ULTIMATE). */
    @Id
    @Column(name = "tier", nullable = false, length = 32)
    private String tier;

    /** Admin-editable display title shown to users (e.g. "Free", "Pro", "Ultimate"). */
    @Column(name = "title", nullable = false)
    private String title;

    /** Access duration in months, or {@code null} for a plan that never expires. */
    @Column(name = "duration_months")
    private Integer durationMonths;

    /** Maximum number of devices a user on this plan may activate. */
    @Column(name = "max_devices", nullable = false)
    private int maxDevices;
}
