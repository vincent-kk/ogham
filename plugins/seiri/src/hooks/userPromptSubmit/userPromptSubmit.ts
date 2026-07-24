import {
  TURN_REMINDER_STANDARD,
  TURN_REMINDER_STRICT,
} from '../../constants/hooks.js';
import { INJECTION_PREFIX } from '../../constants/plugin.js';
import { loadIntervention } from '../../core/infra/configLoader/loaders/loadIntervention.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';

const QUIET: HookOutput = { continue: true };

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
 */
export function processUserPromptSubmit(
  input: UserPromptSubmitInput,
): HookOutput {
  if (!input.cwd) return QUIET;

  const effective = loadIntervention(input.cwd).effective;
  const line =
    effective === 'strict'
      ? TURN_REMINDER_STRICT
      : effective === 'standard'
        ? TURN_REMINDER_STANDARD
        : undefined;
  if (line === undefined) return QUIET;

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: `${INJECTION_PREFIX} ${line}`,
    },
  };
}
