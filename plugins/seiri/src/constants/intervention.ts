/**
 * The dial positions, by name — the source the level tuple and the
 * semantic constants below derive from.
 */
export const INTERVENTION = {
  OFF: 'off',
  ADVISORY: 'advisory',
  STANDARD: 'standard',
  STRICT: 'strict',
} as const;

/**
 * Intervention dial. Changes what the hooks say and record — the
 * SessionStart status render, the SubagentStart election line, the
 * per-turn reminder, and whether `postToolUse` counts a failure at all —
 * never the deployed rule documents, whose bytes must keep matching
 * templateHash.
 *
 * A literal tuple, not `Object.values(INTERVENTION)`: `z.enum` and the
 * derived `InterventionLevel` need the fixed shape a plain array widens away.
 */
export const INTERVENTION_LEVELS = [
  INTERVENTION.OFF,
  INTERVENTION.ADVISORY,
  INTERVENTION.STANDARD,
  INTERVENTION.STRICT,
] as const;

/**
 * Dial applied when a project has configured nothing of its own. The
 * hooks stay inert until a project or user explicitly opts into a more
 * active position; the skills remain available for direct invocation.
 */
export const DEFAULT_INTERVENTION = INTERVENTION.OFF;

/**
 * The position where hook processors stop before reading or writing any
 * workflow state and hook entry points leave stdout empty.
 */
export const DISABLED_INTERVENTION = INTERVENTION.OFF;

/**
 * The status-only position. Workflow-chain hooks use this threshold to
 * avoid recording turn and failure state, while SessionStart may still
 * report rule status. Full hook disablement is
 * {@link DISABLED_INTERVENTION}.
 */
export const SILENT_INTERVENTION = INTERVENTION.ADVISORY;
