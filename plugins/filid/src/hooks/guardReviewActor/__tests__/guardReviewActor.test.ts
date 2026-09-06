import { describe, expect, it } from 'vitest';

import type { PreToolUseInput } from '../../../types/hooks.js';
import { guardReviewActor } from '../guardReviewActor.js';

/** Create a host-valid actor hook event with focused overrides. */
function createInput(
  overrides: Partial<PreToolUseInput> = {},
): PreToolUseInput {
  return {
    cwd: '/project',
    session_id: 'session',
    hook_event_name: 'PreToolUse',
    agent_type: 'review-actor',
    tool_name: 'mcp__plugin_filid_tools__review_state',
    tool_input: { action: 'context' },
    ...overrides,
  };
}

describe('guardReviewActor', () => {
  it('passes the exact broker capability for scoped and unscoped actor names', () => {
    expect(guardReviewActor(createInput())).toEqual({ continue: true });
    expect(
      guardReviewActor(createInput({ agent_type: 'filid:review-actor' })),
    ).toEqual({ continue: true });
  });

  it.each([
    ['Read', { file_path: '/project/file.ts' }],
    ['Bash', { command: 'git status --short' }],
    ['Agent', { subagent_type: 'general-purpose' }],
    ['mcp__other__read', {}],
    ['mcp__plugin_filid_tools__review_state', { action: 'prepare' }],
  ])('denies actor escape through %s', (tool_name, tool_input) => {
    const result = guardReviewActor(createInput({ tool_name, tool_input }));
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('does not decide permissions for other agents', () => {
    expect(
      guardReviewActor(
        createInput({ agent_type: 'general-purpose', tool_name: 'Bash' }),
      ),
    ).toEqual({ continue: true });
  });
});
