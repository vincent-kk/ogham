import { HostTool } from '../../constants/hooks.js';
import { SILENT_INTERVENTION } from '../../constants/intervention.js';
import { EMPTY_RESULT } from '../../constants/plugin.js';
import { loadIntervention } from '../../core/infra/configLoader/loaders/loadIntervention.js';
import { recordWorkflowState } from '../../core/sessionSignals/record/recordWorkflowState.js';
import type {
  HookOutput,
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../types/hooks.js';

import { bashOutcome } from './utils/bashOutcome.js';

/**
 * Watch two tools and inject at most one line.
 *
 * `Skill` is observed and never answered: loading a seiri workflow records
 * where the session now is, so the next turn can say what that state owes.
 * `Bash` carries gate verdicts and the failure chain. Both are
 * matcher-selected in `hooks.json`, so anything else here is a payload
 * that should not have arrived — it leaves without touching state.
 *
 * @param input Hook payload for a successful or failed tool invocation.
 * @returns A fail-open hook result with at most one injected context line.
 */
export function processToolOutcome(
  input: PostToolUseInput | PostToolUseFailureInput,
): HookOutput {
  if (!input.cwd || !input.session_id) return EMPTY_RESULT;

  // The dial gates before any state is touched: at the silent floor this
  // hook costs one config read and writes nothing, which is the state the
  // dispatch measurements were taken against.
  if (loadIntervention(input.cwd).effective === SILENT_INTERVENTION)
    return EMPTY_RESULT;

  if (input.tool_name === HostTool.SKILL) {
    recordWorkflowState(input.cwd, input.session_id, input.tool_input?.skill);
    return EMPTY_RESULT;
  }

  return bashOutcome(input);
}
