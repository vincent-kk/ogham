import { describe, expect, it } from 'vitest';

import { validatePreToolUse } from '../../../hooks/preToolUse/helpers/preToolValidator/preToolValidator.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

// Write-gate edge cases around empty content — split out of
// preToolValidator.test.ts, which is at the 3+12 case cap.

function writeInput(filePath: string, content: string): PreToolUseInput {
  return {
    cwd: '/workspace',
    session_id: 'test-session',
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    tool_input: { file_path: filePath, content },
  };
}

const VALID_INTENT = [
  '# mod',
  '',
  '## Purpose',
  '',
  'Fixture module.',
  '',
  '## Boundaries',
  '',
  '### Always do',
  '',
  '- keep tests deterministic',
  '',
  '### Ask first',
  '',
  '- expanding scope',
  '',
  '### Never do',
  '',
  '- mutating real repos',
].join('\n');

describe('preToolValidator write gate (empty content)', () => {
  it('empty-content INTENT.md Write is validated, not bypassed', () => {
    // Regression: `!content` short-circuited before validateIntentMd, so an
    // empty Write escaped the 3-tier section check entirely. Missing 3-tier
    // sections are a warning (not a deny) — the warning must now surface.
    const result = validatePreToolUse(
      writeInput('/workspace/mod/INTENT.md', ''),
    );
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'missing 3-tier boundary sections',
    );
  });

  it('valid 3-tier INTENT.md Write still passes', () => {
    const result = validatePreToolUse(
      writeInput('/workspace/mod/INTENT.md', VALID_INTENT),
    );
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  it('empty-content Write to non-INTENT targets keeps the passthrough', () => {
    const result = validatePreToolUse(
      writeInput('/workspace/mod/DETAIL.md', ''),
      '# old detail\n',
    );
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});
