/**
 * The hardware integration point for Attendance (blueprint section 5:
 * "the hardware access-control adapter lives inside the Attendance
 * module, not in a generic integrations grab-bag"; phase table, Phase 9:
 * "the mock adapter is swappable without touching the rest of the
 * module").
 *
 * Deliberately narrow: this interface answers ONE question — "given this
 * member, should physical entry be granted, from the hardware/access-
 * control layer's point of view?" It does NOT decide whether the member's
 * subscription is active, and it does NOT enforce "no double check-in" —
 * those are domain rules that apply no matter what's plugged in here, so
 * they live in AttendanceService, not here. Keeping that split means
 * swapping the mock for a real RFID/turnstile controller later never
 * requires touching a business rule, and vice versa.
 */
export interface AccessControlDecision {
  granted: boolean
  reason?: string
}

export interface AccessControlAdapter {
  evaluateEntry(input: { organizationId: string; memberId: string }): Promise<AccessControlDecision>
}

/**
 * DI token — bound to MockAccessControlAdapter today in
 * attendance.module.ts. Swapping in a real adapter later is a one-line
 * change to that binding; AttendanceService only ever depends on this
 * token, never on a concrete class.
 */
export const ACCESS_CONTROL_ADAPTER = Symbol('ACCESS_CONTROL_ADAPTER')
