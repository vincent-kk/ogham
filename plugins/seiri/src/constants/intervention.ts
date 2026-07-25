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
 * D7-E (Arm S) SubagentStart-only text — the harness's election contract,
 * restated at the moment a subagent spawns, since a subagent does not
 * inherit the parent's SessionStart context. Deliberately distinct from
 * `WORKFLOW_CHAIN_LINE`/`STRICT_POSTURE_LINE` (constants/hooks.ts), which
 * the SessionStart render keeps unchanged — this experiment's variable is
 * the SubagentStart moment only, never the deployed rule documents.
 *
 * `standard`: procedure framing, no skill name. `strict`: names each
 * moment's owning skill directly, namespaced. Both force election
 * (load-order) only — adoption (a stated-reason deviation after reading)
 * stays with the model, which is why both end on "decide after reading" /
 * "deviations are yours to make, with a stated reason".
 */
export const ELECTION_STANDARD_LINE =
  'Election: defined workflows govern these moments — a failure appearing, multi-step work starting, a done-claim forming, review arriving or departing. When a moment matches, load the matching seiri workflow before acting; decide after reading. Deviations are yours to make, with a stated reason.';

export const ELECTION_STRICT_LINE =
  'Election contract: these moments have owners — a failure appears → load `/seiri:trace-cause` · multi-step work begins → `/seiri:write-plan` · a plan exists → `/seiri:execute` · before implementing → `/seiri:implement` · before saying done/fixed/passing → `/seiri:verify` · requesting review → `/seiri:request-review` · feedback arrives → `/seiri:receive-review`. Load first, decide after reading — deviations are yours to make, with a stated reason. Matching without loading is a skipped election, not a judgment.';

/**
 * Dial → SubagentStart election text. `advisory` has no entry — the
 * lookup misses and the caller renders silence, keeping that dial position
 * exactly as the dispatch measurements were taken against.
 */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STRICT_LINE,
} as const;
