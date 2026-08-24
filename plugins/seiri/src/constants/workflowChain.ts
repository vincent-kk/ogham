import type { WORKFLOW_INVOCABLE_SKILLS } from './skillPolicy.js';

/** A workflow whose load leaves a state the next moment can be handed. */
export type WorkflowSkill = (typeof WORKFLOW_INVOCABLE_SKILLS)[number];

/**
 * Chain membership as a runtime value: the auto-invocable skills, stated
 * literally so a hook bundle carries nine short names and never the
 * hand-off sentences they key into (constants/workflowStateLines.ts). A
 * literal copy rather than a spread of the skillPolicy arrays because a
 * spread is a statement esbuild will not shake — it would carry the whole
 * policy table into every hook. `satisfies` rejects a stranger;
 * completeness against `WORKFLOW_INVOCABLE_SKILLS` is `skillPolicy.test.ts`'s
 * to hold.
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
