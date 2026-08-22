import { EMPTY_RESULT, INJECTION_PREFIX } from '../../constants/plugin.js';
import {
  TURN_REMINDER_STANDARD,
  TURN_REMINDER_STRICT,
} from '../../constants/turnReminders.js';
import { WORKFLOW_STATE_LINES } from '../../constants/workflowStateLines.js';
import { loadIntervention } from '../../core/infra/configLoader/loaders/loadIntervention.js';
import { consumeWorkflowState } from '../../core/sessionSignals/record/consumeWorkflowState.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';

import { ledgerReminder } from './utils/ledgerReminder.js';

/**
 * UserPromptSubmit: re-raise the skill-dispatch reminder once per turn.
 *
 * SessionStart states the posture at the top of a session, but a long
 * session scrolls it off and a compaction drops it entirely — and the
 * moment a skill should fire is exactly the moment that has decayed. This
 * restates the core each turn, before the model acts.
 *
 * Injection only, no decision control: the repository owns truth (P2), so
 * this reminds and never blocks. The dial gates it before anything renders
 * — advisory is silent, which keeps a baseline project paying nothing and
 * leaves the dispatch rates as they were measured. standard and strict
 * carry different lines: standard reminds, strict widens to borderline work
 * and a named verification.
 *
 * @param input Hook payload for the user prompt about to run.
 * @returns A fail-open reminder result for the active intervention dial.
 */
export function processUserPromptSubmit(
  input: UserPromptSubmitInput,
): HookOutput {
  if (!input.cwd) return EMPTY_RESULT;

  const effective = loadIntervention(input.cwd).effective;
  const line =
    effective === 'strict'
      ? TURN_REMINDER_STRICT
      : effective === 'standard'
        ? TURN_REMINDER_STANDARD
        : undefined;
  if (line === undefined) return EMPTY_RESULT;

  const lines = [`${INJECTION_PREFIX} ${line}`];
  const state = pendingState(input.cwd, input.session_id);
  if (state !== undefined) lines.push(`${INJECTION_PREFIX} ${state}`);
  const ledger = ledgerReminder(input.cwd);
  if (ledger !== undefined) lines.push(`${INJECTION_PREFIX} ${ledger}`);

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: lines.join('\n'),
    },
  };
}

/**
 * Where the chain already is, said once per workflow load.
 *
 * The reminder says which moments have owners; this says which one just
 * ran and who owns the next — the part no injected posture can know,
 * because it comes from what the session actually did.
 *
 * Fails open in both directions: unreadable state costs the clause and
 * never the reminder, and nothing here can stop a turn.
 *
 * @param cwd Project working directory containing session state.
 * @param sessionId Session whose latest workflow signal should be consumed.
 * @returns The pending workflow clause, or undefined when none is readable.
 */
function pendingState(cwd: string, sessionId: string): string | undefined {
  try {
    const skill = consumeWorkflowState(cwd, sessionId);
    return skill === undefined ? undefined : WORKFLOW_STATE_LINES[skill];
  } catch {
    return undefined;
  }
}
