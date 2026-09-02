import { INTERVENTION } from './intervention.js';

/**
 * The election contract (D7-E, Arm S), restated by every channel that
 * carries posture: SubagentStart, where a spawn inherits none of the
 * parent's SessionStart context, SessionStart itself, and the
 * `rule_docs_sync` config posture echo. It sits beside
 * `WORKFLOW_CHAIN_LINE` (constants/postureLines.ts) rather than replacing
 * it — the chain says which workflow follows which, this says a matching
 * moment is loaded before it is acted on. Neither touches the deployed
 * rule documents, whose bytes must keep matching templateHash.
 *
 * `standard` frames the procedure and names exactly one skill: the
 * done-claim moment, where the measured standard/strict gap concentrated.
 * `strict` names every moment's owner outright. Both reach that claim
 * whoever makes it — a user saying "it's done" arrives at the same moment
 * as the model saying it, and the self-made-only reading left that
 * arrival unowned. Both force election (load-order) only — adoption (a
 * stated-reason deviation after reading) stays with the model, which is
 * why both end on "decide after reading" / "deviations are yours to make,
 * with a stated reason".
 *
 * In its own file so only the render path carries these bytes: every
 * dial consumer imports `constants/intervention.ts`, and the
 * computed-key map below is the one statement esbuild cannot prove
 * pure — inlined there, it rode into every hook and the MCP server.
 */
export const ELECTION_STANDARD_LINE =
  "Election: defined workflows govern these moments — a failure appearing, multi-step work starting, review arriving or departing — load the matching seiri workflow before acting. One moment is named: when done, fixed, or passing is said or heard — your claim or the user's — load `/seiri:verify`. Decide after reading — deviations are yours to make, with a stated reason.";

export const ELECTION_STRICT_LINE =
  "Election contract: these moments have owners — a failure appears → load `/seiri:trace-cause` · multi-step work begins → `/seiri:write-plan` · a plan lands → `/seiri:review-plan` · a reviewed plan — or its stated skip → `/seiri:execute` · before implementing → `/seiri:implement` · done/fixed/passing said or heard, your claim or the user's → `/seiri:verify` · requesting review → `/seiri:request-review` · feedback arrives → `/seiri:receive-review`. Load first, decide after reading — deviations are yours to make, with a stated reason. Matching without loading is a skipped election, not a judgment.";

/**
 * Dial → election text. `off` and `advisory` have no entries, so the
 * lookup misses and every caller renders no workflow election.
 */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STRICT_LINE,
} as const;
