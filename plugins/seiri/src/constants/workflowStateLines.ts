import type { WorkflowSkill } from './workflowChain.js';

/**
 * What a loaded workflow left behind, and who owns the moment after it.
 *
 * The election lines say which workflow owns a moment; these say where the
 * session already is — a fact no injected posture can know, because it
 * comes from what actually ran. One clause, said once per load: the state
 * is a hand-off note, not a banner.
 *
 * Keyed by {@link WorkflowSkill}, so an auto-invocable skill added without
 * a clause fails typecheck rather than silently dropping out of the chain.
 *
 * Only the per-turn render (userPromptSubmit) imports this file — the
 * recording side checks membership against `WORKFLOW_SKILLS` instead.
 */
export const WORKFLOW_STATE_LINES: Record<WorkflowSkill, string> = {
  'write-plan':
    'A plan was produced — `/seiri:review-plan` proves its claims before `/seiri:execute` performs it.',
  'review-plan':
    'The plan was reviewed — cleared or grounded-only, `/seiri:execute` owns it; rework-required re-enters `/seiri:write-plan` for one scoped pass.',
  execute:
    'A plan is being carried out — the claim that it is done is `/seiri:verify`’s to make.',
  implement:
    'A change was implemented — whether it works is `/seiri:verify`’s answer.',
  'trace-cause': 'A cause was traced — the fix still owes `/seiri:verify`.',
  verify:
    'Verification ran — an unmet ledger sends the claim back to `/seiri:execute`; substantial work goes out through `/seiri:request-review`.',
  'request-review':
    'Review was requested — what comes back enters `/seiri:receive-review`.',
  'receive-review':
    'Review feedback is in hand — changed code re-enters `/seiri:verify`.',
  'trace-structure':
    'The structure was traced — multi-step work from here starts at `/seiri:write-plan`.',
};
