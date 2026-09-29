import { INTERVENTION } from './intervention.js';

/**
 * Standard's election line, keyed to behavior changes in source or tests.
 * Documentation and read-only answers need no workflow; a contained fix can
 * enter implement directly. User-prescribed procedures name actors in steps.
 */
export const ELECTION_STANDARD_LINE =
  'Election: decide it before the first edit — a behavior change to source or tests (new logic, a fix, a refactor) → seiri:write-plan, or seiri:implement alone for one contained fix; an approved plan → seiri:execute; a failure inside an active task → seiri:trace-cause; your own completion claim inside an active task → seiri:verify. Documentation, comments, formatting, and read-only answers (a review, an explanation, an analysis) start no workflow and write no plan. A user-prescribed procedure (who reviews, who implements) names actors inside these steps; it never replaces a step or moves the plan.';

/**
 * Strict's election line for behavior changes in source or tests, adding
 * review-plan, implement, request-review, and receive-review to standard.
 */
export const ELECTION_STRICT_LINE =
  'Election[strict]: decide it before the first edit — a behavior change to source or tests → seiri:write-plan, checked by seiri:review-plan before seiri:execute carries it out; each planned change unit → seiri:implement; a failure inside an active task → seiri:trace-cause; your own completion claim → seiri:verify; substantial finished work → seiri:request-review; review feedback → seiri:receive-review. Documentation, comments, formatting, and read-only answers (a review, an explanation, an analysis) start no workflow and write no plan. A user-prescribed procedure (who reviews, who implements) names actors inside these steps; it never replaces a step or moves the plan.';

/**
 * Returned by the runtime MCP tool's dial posture echo at standard and
 * strict, and by SessionStart's render at the same positions.
 */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STRICT_LINE,
} as const;
