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

/**
 * The election contract (D7-E, Arm S), restated by both injection
 * channels: SubagentStart, where a spawn inherits none of the parent's
 * SessionStart context, and SessionStart itself. It sits beside
 * `WORKFLOW_CHAIN_LINE` (constants/hooks.ts) rather than replacing it —
 * the chain says which workflow follows which, this says a matching
 * moment is loaded before it is acted on. Neither touches the deployed
 * rule documents, whose bytes must keep matching templateHash.
 *
 * `standard` frames the procedure and names exactly one skill: the
 * done-claim moment, where the measured standard/strict gap concentrated.
 * `strict` names every moment's owner outright. Both force election
 * (load-order) only — adoption (a stated-reason deviation after reading)
 * stays with the model, which is why both end on "decide after reading" /
 * "deviations are yours to make, with a stated reason".
 */
export const ELECTION_STANDARD_LINE =
  'Election: defined workflows govern these moments — a failure appearing, multi-step work starting, review arriving or departing — load the matching seiri workflow before acting. One moment is named: before saying done, fixed, or passing, load `/seiri:verify`. Decide after reading — deviations are yours to make, with a stated reason.';

export const ELECTION_STRICT_LINE =
  'Election contract: these moments have owners — a failure appears → load `/seiri:trace-cause` · multi-step work begins → `/seiri:write-plan` · a plan exists → `/seiri:execute` · before implementing → `/seiri:implement` · before saying done/fixed/passing → `/seiri:verify` · requesting review → `/seiri:request-review` · feedback arrives → `/seiri:receive-review`. Load first, decide after reading — deviations are yours to make, with a stated reason. Matching without loading is a skipped election, not a judgment.';

/**
 * Dial → election text. `advisory` has no entry — the lookup misses and
 * every caller renders silence, keeping that dial position exactly as the
 * dispatch measurements were taken against. A missing entry, not a branch
 * in each caller, is what makes the opt-out hold across channels.
 */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STRICT_LINE,
} as const;
