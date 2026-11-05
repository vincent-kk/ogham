import { describe, expect, it } from 'vitest';

import type { PreToolUseInput } from '../../../../../types/hooks.js';
import { validatePreToolUse } from '../preToolValidator.js';

/** Complete optional contract without redundant acceptance groups. */
const DETAIL =
  '# Contract\n## Requirements\nKeep reasons.\n## API Contracts\nKeep policies.\n## Acceptance Criteria\nTests pin the criteria.\n## Last Updated\nWhen the contract changes.\n';

/**
 * Construct a host operation without touching the filesystem.
 * @param content - Complete proposed DETAIL body, including empty text.
 * @returns The normalized Write input consumed by the gate.
 */
function write(content: string): PreToolUseInput {
  return {
    cwd: '/workspace',
    session_id: 'fixture',
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: { file_path: '/workspace/DETAIL.md', content },
  };
}

describe('optional DETAIL document operations', () => {
  it.each([
    '',
    DETAIL + '## History\nA decision.\n',
    DETAIL.replace('When the contract changes.', '2026-11-05'),
  ])('denies an invalid first Write', (content) => {
    expect(
      validatePreToolUse(write(content)).hookSpecificOutput?.permissionDecision,
    ).toBe('deny');
  });

  it('allows a valid first Write without acceptance groups', () => {
    expect(
      validatePreToolUse(write(DETAIL)).hookSpecificOutput?.permissionDecision,
    ).toBeUndefined();
  });

  it('still rejects append-only replacement of an existing document', () => {
    expect(
      validatePreToolUse(write(DETAIL + 'More records.\n'), DETAIL)
        .hookSpecificOutput?.permissionDecision,
    ).toBe('deny');
  });

  it('allows deletion with retention guidance regardless of entry-point evidence', () => {
    const result = validatePreToolUse({ ...write(''), tool_name: 'Delete' });
    expect(result.hookSpecificOutput).toEqual({
      permissionDecision: 'allow',
      additionalContext:
        'DETAIL.md is optional: delete it only when it holds no reason, policy, exemption or acceptance group that a verification file binds.',
    });
  });
});
