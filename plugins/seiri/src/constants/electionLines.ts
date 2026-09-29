import { INTERVENTION } from './intervention.js';

/**
 * Standard's election line, keyed to behavior changes in source or tests.
 * Documentation and read-only answers need no workflow; a contained fix can
 * enter implement directly. User-prescribed procedures name actors in steps.
 */
export const ELECTION_STANDARD_LINE =
  'Election: decide it before the first edit — a behavior change to source or tests (logic, a fix, a refactor) → seiri:write-plan, or seiri:implement for one contained fix; an approved plan → seiri:execute; inside an active task, a failure → seiri:trace-cause and your completion claim → seiri:verify. Documentation, comments, formatting, or a read-only answer (review, explanation, analysis) starts no workflow. A user-prescribed procedure (who reviews, who implements) names actors inside these steps, never replacing a step or moving the plan.';

/**
 * Strict's election line for behavior changes in source or tests, adding
 * review-plan, implement, request-review, and receive-review to standard.
 */
export const ELECTION_STRICT_LINE =
  'Election[strict]: decide it before the first edit: a behavior change to source or tests → seiri:write-plan, reviewed by seiri:review-plan, then seiri:execute with each unit through seiri:implement; a failure inside an active task → seiri:trace-cause; your completion claim → seiri:verify; finished work → seiri:request-review; review feedback → seiri:receive-review. Documentation, comments, formatting, or a read-only answer starts no workflow. A user-prescribed procedure (who reviews, who implements) names actors inside these steps, never replacing a step or moving the plan.';

/**
 * Returned by the runtime MCP tool's dial posture echo at standard and
 * strict, and by SessionStart's render at the same positions.
 */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STRICT_LINE,
} as const;
