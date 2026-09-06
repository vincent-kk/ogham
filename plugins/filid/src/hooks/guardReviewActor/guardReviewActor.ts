import type { HookOutput, PreToolUseInput } from '../../types/hooks.js';

/** Sole tool exposed to a native incremental review actor. */
const REVIEW_STATE_TOOL = 'mcp__plugin_filid_tools__review_state';
/** Fixed denial avoids reflecting untrusted tool input into host output. */
const REVIEW_ACTOR_DENIAL: HookOutput = {
  continue: true,
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason:
      'The review actor may only call review_state with action=context.',
  },
};

/**
 * Restrict a Claude review actor to the context broker capability.
 * @param input Host-provided PreToolUse event with optional subagent identity.
 * @returns A per-tool denial for actor escapes, or a decision-free pass.
 */
export function guardReviewActor(input: PreToolUseInput): HookOutput {
  const isReviewActor =
    input.agent_type === 'review-actor' ||
    input.agent_type === 'filid:review-actor';
  if (!isReviewActor) return { continue: true };

  const allowed =
    input.hook_event_name === 'PreToolUse' &&
    input.tool_name === REVIEW_STATE_TOOL &&
    input.tool_input.action === 'context';
  return allowed ? { continue: true } : REVIEW_ACTOR_DENIAL;
}
