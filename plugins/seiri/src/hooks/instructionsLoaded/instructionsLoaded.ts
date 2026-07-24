import { EMPTY_RESULT } from '../../constants/plugin.js';
import type { HookOutput, InstructionsLoadedInput } from '../../types/hooks.js';

import { appendObservation } from './utils/appendObservation.js';

/**
 * InstructionsLoaded: record that an instruction file entered context.
 *
 * Injects nothing, and cannot — Claude Code ignores this event's exit
 * code and gives it no decision control. That is exactly why it suits
 * measurement: it observes delivery without altering it.
 *
 * The whole payload is persisted rather than a chosen subset. The public
 * hooks reference documents this event's load reasons and the fields
 * common to all hooks, but not its event-specific keys, so the first live
 * sessions are what reveal the real shape. Selecting fields now would
 * discard the very thing being measured.
 */
export function processInstructionsLoaded(
  input: InstructionsLoadedInput,
): HookOutput {
  appendObservation({ observedAt: new Date().toISOString(), ...input });
  return EMPTY_RESULT;
}
