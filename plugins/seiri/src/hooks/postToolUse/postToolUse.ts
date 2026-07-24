import { HookEvent } from '../../constants/hooks.js';
import { SILENT_INTERVENTION } from '../../constants/intervention.js';
import { INJECTION_PREFIX } from '../../constants/plugin.js';
import { FAILURE_CHAIN_LINE } from '../../constants/signals.js';
import { loadIntervention } from '../../core/infra/configLoader/loaders/loadIntervention.js';
import { recordBashFailure } from '../../core/sessionSignals/record/recordBashFailure.js';
import { recordBashSuccess } from '../../core/sessionSignals/record/recordBashSuccess.js';
import type {
  HookOutput,
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../types/hooks.js';

const QUIET: HookOutput = { continue: true };

/**
 * Notice when the same shell command keeps failing, and say so once.
 *
 * Registered under two events because Claude Code splits them: a non-zero
 * exit arrives as `PostToolUseFailure`, a zero exit as `PostToolUse`. One
 * counts, the other forgets — a chain is only a chain while nothing has
 * gone green.
 *
 * The line it can emit is a suggestion and nothing else. seiri owns no
 * decision control here: a red that was written on purpose is
 * indistinguishable from a fix that is not landing, so the text concedes
 * the first case rather than pretending to tell them apart.
 */
export function processBashOutcome(
  input: PostToolUseInput | PostToolUseFailureInput,
): HookOutput {
  const command = input.tool_input?.command;
  if (
    input.tool_name !== 'Bash' ||
    typeof command !== 'string' ||
    command.trim() === '' ||
    !input.cwd ||
    !input.session_id
  )
    return QUIET;

  // The dial gates before any state is touched: at the silent floor this
  // hook costs one config read and writes nothing, which is the state the
  // dispatch measurements were taken against.
  if (loadIntervention(input.cwd).effective === SILENT_INTERVENTION)
    return QUIET;

  if (input.hook_event_name !== HookEvent.POST_TOOL_USE_FAILURE) {
    recordBashSuccess(input.cwd, input.session_id, command);
    return QUIET;
  }

  // A run the user stopped says nothing about the command.
  if (input.is_interrupt) return QUIET;

  if (!recordBashFailure(input.cwd, input.session_id, command)) return QUIET;

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: `${INJECTION_PREFIX} ${FAILURE_CHAIN_LINE}`,
    },
  };
}
