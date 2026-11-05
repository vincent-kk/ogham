import { EMPTY_RESULT } from '../../constants/plugin.js';
import type { HookOutput, InstructionsLoadedInput } from '../../types/hooks.js';
import { loadHookIntervention } from '../shared/loadHookIntervention.js';

import { appendObservation } from './utils/appendObservation.js';

/**
 * InstructionsLoaded: record that an instruction file entered context.
 *
 * Injects nothing, and cannot — Claude Code ignores this event's exit
 * code and gives it no decision control. That is exactly why it suits
 * measurement: it observes delivery without altering it.
 *
 * Persist only the allowed common fields and instruction-load metadata;
 * unknown host fields cannot add rule bodies or user code to the log.
 * @param input Native hook payload; cwd is required to resolve the observation dial.
 * @returns A nonblocking result with no injected context; persistence failures are swallowed.
 */
export function processInstructionsLoaded(
  input: InstructionsLoadedInput,
): HookOutput {
  if (!input.cwd || loadHookIntervention(input.cwd) === undefined)
    return EMPTY_RESULT;
  appendObservation({
    observedAt: new Date().toISOString(),
    cwd: input.cwd,
    session_id: input.session_id,
    hook_event_name: input.hook_event_name,
    transcript_path: input.transcript_path,
    turn_id: input.turn_id,
    prompt_id: input.prompt_id,
    tool_use_id: input.tool_use_id,
    agent_id: input.agent_id,
    model: input.model,
    permission_mode: input.permission_mode,
    reason: input.reason,
    file_path: input.file_path,
    memory_type: input.memory_type,
    load_reason: input.load_reason,
    globs: input.globs,
    trigger_file_path: input.trigger_file_path,
    parent_file_path: input.parent_file_path,
  });
  return EMPTY_RESULT;
}
