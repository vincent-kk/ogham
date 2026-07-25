import type { AUTO_INVOCABLE_SKILLS } from './skillPolicy.js';

/**
 * Consecutive failures of the same command before seiri says anything.
 *
 * Set where a deliberate red-then-green loop cannot reach it: the
 * implement discipline asks for a failing test first, so one or two
 * failures of the same command are the normal, correct shape of the work.
 * A third with nothing having gone green in between is the point where
 * "the fix is not landing" becomes more likely than "this red is on
 * purpose" — and even then the line only suggests.
 */
export const FAILURE_CHAIN_THRESHOLD = 3;

/**
 * Distinct commands tracked per session before the oldest is dropped.
 *
 * The counters are a bounded scratchpad, not a log. A long session runs
 * hundreds of commands and none of the old ones can still be part of a
 * consecutive chain.
 */
export const TRACKED_COMMANDS_CAP = 32;

/**
 * The one line the chain is allowed to inject.
 *
 * It concedes the fail-first case in its own text rather than trying to
 * tell the two apart, because nothing in a hook payload can: a test that
 * fails because it was written to is byte-identical to one that fails
 * because the fix is wrong.
 */
export const FAILURE_CHAIN_LINE = `The same command has failed ${FAILURE_CHAIN_THRESHOLD} times with nothing green in between — if this red is intended (fail-first), proceed; otherwise consider trace-cause before patching again.`;

/** A workflow whose load leaves a state the next moment can be handed. */
export type WorkflowSkill = (typeof AUTO_INVOCABLE_SKILLS)[number];

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
 */
export const WORKFLOW_STATE_LINES: Record<WorkflowSkill, string> = {
  'write-plan': 'A plan was produced — `/seiri:execute` owns its performance.',
  execute:
    'A plan is being carried out — the claim that it is done is `/seiri:verify`’s to make.',
  implement:
    'A change was implemented — whether it works is `/seiri:verify`’s answer.',
  'trace-cause': 'A cause was traced — the fix still owes `/seiri:verify`.',
  verify:
    'Verification ran — substantial work goes out through `/seiri:request-review`.',
  'request-review':
    'Review was requested — what comes back enters `/seiri:receive-review`.',
  'receive-review':
    'Review feedback is in hand — changed code re-enters `/seiri:verify`.',
  'trace-structure':
    'The structure was traced — multi-step work from here starts at `/seiri:write-plan`.',
};
