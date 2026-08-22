import { HookEvent } from '../../../constants/hooks.js';
import type { CheckOutcome } from '../../../types/gates.js';
import type {
  PostToolUseFailureInput,
  PostToolUseInput,
} from '../../../types/hooks.js';

/**
 * Adapt one host hook payload to the channels a gate can judge.
 *
 * @param input Successful or failed tool-use payload.
 * @returns Observable stdout/stderr or failure error and exit code.
 */
export function toCheckOutcome(
  input: PostToolUseInput | PostToolUseFailureInput,
): CheckOutcome {
  if (input.hook_event_name === HookEvent.POST_TOOL_USE_FAILURE) {
    const error = typeof input.error === 'string' ? input.error : '';
    const match = /Exit code (\d+)/.exec(error);
    return {
      kind: 'failure',
      error,
      exit: match === null ? undefined : Number(match[1]),
    };
  }

  return {
    kind: 'success',
    stdout:
      typeof input.tool_response?.stdout === 'string'
        ? input.tool_response.stdout
        : '',
    stderr:
      typeof input.tool_response?.stderr === 'string'
        ? input.tool_response.stderr
        : '',
  };
}
