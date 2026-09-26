import type { WORKFLOW_INVOCABLE_SKILLS } from './skillPolicy.js';

/** A workflow whose load leaves a state the next moment can be handed. */
export type WorkflowSkill = (typeof WORKFLOW_INVOCABLE_SKILLS)[number];

/**
 * Chain membership as a runtime value: the auto-invocable skills, stated
 * literally so a hook bundle carries nine short names and never the
 * hand-off sentences they key into. A literal copy rather than a spread of
 * the skillPolicy arrays because a spread is a statement esbuild will not
 * shake — it would carry the whole policy table into every hook.
 * `satisfies` rejects a stranger; completeness against
 * `WORKFLOW_INVOCABLE_SKILLS` is `skillPolicy.test.ts`'s
 * "workflow chain membership mirrors the auto-invocable set" to hold.
 */
export const WORKFLOW_SKILLS = [
  'execute',
  'implement',
  'receive-review',
  'request-review',
  'review-plan',
  'trace-cause',
  'trace-structure',
  'verify',
  'write-plan',
] as const satisfies readonly WorkflowSkill[];

/**
 * The only steps a `step` request may use to create or switch a binding.
 * Every other chain skill's `step` can only update an existing binding for
 * the same task.
 */
export const CHAIN_ENTRY_STEPS = ['write-plan', 'execute'] as const;

/**
 * Display order of the main chain, left to right, as rendered by a
 * progress line's bracketed body. Distinct from {@link WORKFLOW_SKILLS},
 * which states chain membership rather than reading order.
 */
export const MAIN_CHAIN_STEPS = [
  'write-plan',
  'review-plan',
  'execute',
  'implement',
  'verify',
  'request-review',
] as const satisfies readonly WorkflowSkill[];

/**
 * Steps a binding can record that sit outside the main chain's reading
 * order; a progress line appends these after the main chain instead of
 * bracketing a position within it.
 */
export const OFF_CHAIN_STEPS = [
  'trace-cause',
  'trace-structure',
  'receive-review',
] as const satisfies readonly WorkflowSkill[];

/**
 * One clause per chain skill, said once in a progress line after its
 * bracketed position — what a loaded step left behind and who owns the
 * moment after it. Keyed by {@link WorkflowSkill}, so an auto-invocable
 * skill added without a clause fails typecheck rather than silently
 * dropping out of the chain.
 */
export const STEP_PHRASES: Record<WorkflowSkill, string> = {
  'write-plan':
    'planning; seiri:review-plan checks the plan before seiri:execute',
  'review-plan':
    'reviewing the plan; cleared → seiri:execute, rework → seiri:write-plan',
  execute: "executing the plan; completion is seiri:verify's call",
  implement: 'implementing a unit; seiri:verify decides whether it works',
  verify:
    'verifying; unmet gates → seiri:execute, substantial work → seiri:request-review',
  'request-review': 'review requested; replies go to seiri:receive-review',
  'receive-review':
    'handling review feedback; changed code re-enters seiri:verify',
  'trace-cause': 'tracing a failure; the fix still owes seiri:verify',
  'trace-structure':
    'tracing structure; multi-step work starts at seiri:write-plan',
};

/**
 * One-line chain summary, host-neutral (`seiri:<skill>`), injected at
 * SessionStart and at strict, in place of a progress line when no binding
 * is active.
 */
export const WORKFLOW_CHAIN_LINE =
  'Workflow: seiri:write-plan → seiri:review-plan → seiri:execute → seiri:implement → seiri:verify → seiri:request-review; failures → seiri:trace-cause; indirect code → seiri:trace-structure; review feedback → seiri:receive-review.';
