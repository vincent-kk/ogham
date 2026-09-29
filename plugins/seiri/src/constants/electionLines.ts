import { INTERVENTION } from './intervention.js';

/**
 * Standard's election line, keyed to behavior changes in source or tests.
 * Documentation and read-only answers elect nothing; a single contained fix
 * enters implement directly. User-assigned roles decide who performs a step,
 * never which steps run.
 */
export const ELECTION_STANDARD_LINE =
  'Election: decide before the first edit. A behavior change to source or tests (logic, a fix, a refactor) → seiri:write-plan; one contained fix → seiri:implement; an approved plan → seiri:execute. In an active task, a failure → seiri:trace-cause and a completion claim → seiri:verify. Documentation, comments, formatting, and read-only answers (review, explanation, analysis) elect nothing. User-assigned roles (who reviews, who implements) decide who performs a step, not which steps run: none is dropped or reordered, and planning stays in seiri:write-plan.';

/**
 * Strict's election line for behavior changes in source or tests, adding
 * review-plan, implement, request-review, and receive-review to standard and
 * dropping the direct implement entry. Same categories and boundary as
 * standard, stated as a firm instruction: every behavior change enters the
 * workflow regardless of size, and an edit made before the owning skill was
 * invoked is a deviation to stop and correct.
 */
export const ELECTION_STRICT_LINE =
  'Election[strict]: no edit before the owning skill is invoked. Every behavior change to source or tests, however small, must enter seiri:write-plan, then seiri:review-plan, then seiri:execute with each unit via seiri:implement. In an active task, a failure must go to seiri:trace-cause and a completion claim to seiri:verify; finished work → seiri:request-review; review feedback → seiri:receive-review. Documentation, comments, formatting, and read-only answers elect nothing. User-assigned roles decide who performs a step, never which steps run: none is dropped or reordered, and planning stays in seiri:write-plan.';

/**
 * Returned by the runtime MCP tool's dial posture echo at standard and
 * strict, and by SessionStart's render at the same positions.
 */
export const ELECTION_RENDER = {
  [INTERVENTION.STANDARD]: ELECTION_STANDARD_LINE,
  [INTERVENTION.STRICT]: ELECTION_STRICT_LINE,
} as const;
