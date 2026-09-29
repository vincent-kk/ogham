import { INTERVENTION } from './intervention.js';

/**
 * Standard's election line, keyed on the first edit and a file count rather
 * than word signals: a change touching 2+ files or their tests elects a
 * workflow, a single-file surgical change does not, and a review, diff
 * explanation, or read-only analysis never starts one. A user-prescribed
 * procedure fills the steps' actors, never the steps.
 */
export const ELECTION_STANDARD_LINE =
  'Election: decide it before the first edit — a change touching 2+ files or their tests → seiri:write-plan; an approved plan → seiri:execute; a failure inside an active task → seiri:trace-cause; your own completion claim inside an active task → seiri:verify. A single-file surgical change needs no workflow. A review, a diff explanation, or a read-only analysis starts no workflow and writes no plan. A user-prescribed procedure (who reviews, who implements) names actors inside these steps; it never replaces a step or moves the plan.';

/**
 * Strict's owner contract at the same first-edit moment and file-count
 * threshold, adding review-plan, implement, request-review, and
 * receive-review to the standard four.
 */
export const ELECTION_STRICT_LINE =
  'Election[strict]: decide it before the first edit — a change touching 2+ files or their tests → seiri:write-plan, checked by seiri:review-plan before seiri:execute carries it out; each planned change unit → seiri:implement; a failure inside an active task → seiri:trace-cause; your own completion claim → seiri:verify; substantial finished work → seiri:request-review; review feedback → seiri:receive-review. A single-file surgical change needs no workflow. A review, a diff explanation, or a read-only analysis starts no workflow and writes no plan. A user-prescribed procedure (who reviews, who implements) names actors inside these steps; it never replaces a step or moves the plan.';

/**
 * Returned by the runtime MCP tool's dial posture echo at standard and
 * strict, and by SessionStart's render at the same positions.
 */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STRICT_LINE,
} as const;
