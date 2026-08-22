import { FAILURE_CHAIN_LINE } from '../../../constants/failureChain.js';
import { CHAIN_HINT } from '../../../constants/gatesLines.js';
import { HookEvent, HostTool } from '../../../constants/hooks.js';
import { EMPTY_RESULT, INJECTION_PREFIX } from '../../../constants/plugin.js';
import { recordCheckOutcome } from '../../../core/gates/record/recordCheckOutcome.js';
import { renderVerdictLine } from '../../../core/gates/render/renderVerdictLine.js';
import { recordBashFailure } from '../../../core/sessionSignals/record/recordBashFailure.js';
import { recordBashSuccess } from '../../../core/sessionSignals/record/recordBashSuccess.js';
import type { RecordedVerdict } from '../../../types/gates.js';
import type {
  HookOutput,
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../../types/hooks.js';

import { toCheckOutcome } from './toCheckOutcome.js';

/**
 * Judge one Bash payload, retain failure-chain state, and inject one line.
 *
 * @param input Successful or failed Bash hook payload.
 * @returns Non-blocking gate verdict, chain hint, or empty result.
 */
export function bashOutcome(
  input: PostToolUseInput | PostToolUseFailureInput,
): HookOutput {
  const command = input.tool_input?.command;
  if (
    input.tool_name !== HostTool.BASH ||
    typeof command !== 'string' ||
    command.trim() === ''
  )
    return EMPTY_RESULT;

  const failed = input.hook_event_name === HookEvent.POST_TOOL_USE_FAILURE;
  if (failed && input.is_interrupt) return EMPTY_RESULT;

  let verdicts: RecordedVerdict[];
  try {
    verdicts = recordCheckOutcome(
      input.cwd,
      command,
      toCheckOutcome(input),
      input.agent_id,
    );
  } catch {
    verdicts = [];
  }

  let announce = false;
  try {
    if (failed)
      announce = recordBashFailure(input.cwd, input.session_id, command);
    else recordBashSuccess(input.cwd, input.session_id, command);
  } catch {
    // Failure-chain persistence is optional; a recorded verdict is not.
  }

  if (verdicts.length === 0) {
    if (!announce) return EMPTY_RESULT;
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        additionalContext: `${INJECTION_PREFIX} ${FAILURE_CHAIN_LINE}`,
      },
    };
  }

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: `${INJECTION_PREFIX} ${renderVerdictLine(verdicts, {
        agentId: input.agent_id,
        chainHint: announce ? CHAIN_HINT : undefined,
      })}`,
    },
  };
}
