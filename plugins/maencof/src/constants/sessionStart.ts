/**
 * Hard upper bound (Unicode code points) for the meta-skill body.
 *
 * Enforced at BUILD time by scripts/build-hooks.mjs (build fails on overflow —
 * the regex there reads this literal, keep the `= <number>` form). The runtime
 * check in bootstrap is a last-resort backstop that logs before skipping.
 */
export const META_SKILL_MAX_CHARS = 4096;

/** XML tag wrapping meta-skill body in SessionStart `additionalContext`. */
export const META_SKILL_TAG = 'maencof-meta-skill';
