/** Host header allowed for a loopback-only server — blocks DNS rebinding. */
export const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost)(:\d+)?$/i;

/** Origin allowed on state-changing requests — same loopback authority only. */
export const LOOPBACK_ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i;
