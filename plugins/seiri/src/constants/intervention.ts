/**
 * The dial positions, by name — the source the level tuple and the
 * semantic constants below derive from.
 */
export const INTERVENTION = {
  ADVISORY: 'advisory',
  STANDARD: 'standard',
  STRICT: 'strict',
} as const;

/**
 * Intervention dial. Changes the SessionStart render only — never the
 * deployed rule documents, whose bytes must keep matching templateHash.
 *
 * A literal tuple, not `Object.values(INTERVENTION)`: `z.enum` and the
 * derived `InterventionLevel` need the fixed shape a plain array widens away.
 */
export const INTERVENTION_LEVELS = [
  INTERVENTION.ADVISORY,
  INTERVENTION.STANDARD,
  INTERVENTION.STRICT,
] as const;

/**
 * Dial applied when a project has configured nothing of its own — the
 * fallback `loadIntervention` lands on, and the position a fresh setup
 * proposes. `standard` so opting into seiri turns the workflow chain on
 * without a second decision; a project dials down to
 * {@link SILENT_INTERVENTION} to opt back out.
 */
export const DEFAULT_INTERVENTION = INTERVENTION.STANDARD;

/**
 * The quiet floor: the one position where the hooks add no posture line
 * and write no state. `postToolUse` and the SessionStart dial line gate on
 * this — silence here is what makes the dial a real opt-out rather than a
 * volume knob that never reaches zero, and it is the state the dispatch
 * measurements were taken against. Distinct from {@link DEFAULT_INTERVENTION}:
 * the default is what a project gets, this is what it lowers to.
 */
export const SILENT_INTERVENTION = INTERVENTION.ADVISORY;
