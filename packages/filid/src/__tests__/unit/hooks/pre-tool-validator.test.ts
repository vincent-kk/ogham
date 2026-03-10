import { describe, expect, it } from 'vitest';

import {
  isDetailMd,
  validatePreToolUse,
} from '../../../hooks/pre-tool-validator.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

const baseInput: PreToolUseInput = {
  cwd: '/workspace',
  session_id: 'test-session',
  hook_event_name: 'PreToolUse',
  tool_name: 'Write',
  tool_input: {},
};

describe('pre-tool-validator', () => {
  it('should block Write to INTENT.md exceeding 50 lines', () => {
    const content = Array.from({ length: 51 }, (_, i) => `Line ${i + 1}`).join(
      '\n',
    );
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { file_path: '/app/INTENT.md', content },
    };
    const result = validatePreToolUse(input);
    expect(result.continue).toBe(false);
  });

  it('should allow Write to INTENT.md within 50 lines', () => {
    const content = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join(
      '\n',
    );
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { file_path: '/app/INTENT.md', content },
    };
    const result = validatePreToolUse(input);
    expect(result.continue).toBe(true);
  });

  it('should pass through non-INTENT.md/DETAIL.md files', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { file_path: '/app/index.ts', content: 'const x = 1;' },
    };
    const result = validatePreToolUse(input);
    expect(result.continue).toBe(true);
  });

  it('should warn when INTENT.md is missing boundary sections', () => {
    const content = '# My Module\nSome description\n';
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { file_path: '/app/INTENT.md', content },
    };
    const result = validatePreToolUse(input);
    // Missing boundaries is a warning, not a block
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('missing');
  });

  it('should warn on Edit to INTENT.md with >20 new lines', () => {
    const newString = Array.from({ length: 25 }, (_, i) => `Line ${i}`).join(
      '\n',
    );
    const input: PreToolUseInput = {
      ...baseInput,
      tool_name: 'Edit',
      tool_input: {
        file_path: '/app/INTENT.md',
        new_string: newString,
      },
    };
    const result = validatePreToolUse(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      '25 new lines',
    );
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'line limit (50)',
    );
  });

  it('should warn on Edit to INTENT.md with exactly 21 new lines (boundary)', () => {
    const newString = Array.from({ length: 21 }, (_, i) => `Line ${i}`).join(
      '\n',
    );
    const input: PreToolUseInput = {
      ...baseInput,
      tool_name: 'Edit',
      tool_input: {
        file_path: '/app/INTENT.md',
        new_string: newString,
      },
    };
    const result = validatePreToolUse(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      '21 new lines',
    );
  });

  it('should pass Edit to INTENT.md with exactly 20 new lines (boundary)', () => {
    const newString = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join(
      '\n',
    );
    const input: PreToolUseInput = {
      ...baseInput,
      tool_name: 'Edit',
      tool_input: {
        file_path: '/app/INTENT.md',
        new_string: newString,
      },
    };
    const result = validatePreToolUse(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('should pass Edit to INTENT.md with <=20 new lines without warning', () => {
    const newString = Array.from({ length: 5 }, (_, i) => `Line ${i}`).join(
      '\n',
    );
    const input: PreToolUseInput = {
      ...baseInput,
      tool_name: 'Edit',
      tool_input: {
        file_path: '/app/INTENT.md',
        new_string: newString,
      },
    };
    const result = validatePreToolUse(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('should block DETAIL.md if detected as append-only (when old content available)', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/app/DETAIL.md',
        content: 'line1\nline2\nline3\nline4\n',
      },
    };
    const result = validatePreToolUse(input, 'line1\nline2\n');
    expect(result.continue).toBe(false);
  });

  it('should allow DETAIL.md when content is restructured', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/app/DETAIL.md',
        content: '# Refactored\n- New structure\n',
      },
    };
    const result = validatePreToolUse(input, '# Old\n- Old content\n');
    expect(result.continue).toBe(true);
  });
});

describe('isDetailMd', () => {
  it('should be exported and detect DETAIL.md paths', () => {
    expect(isDetailMd('/app/DETAIL.md')).toBe(true);
    expect(isDetailMd('DETAIL.md')).toBe(true);
    expect(isDetailMd('/app/SPEC.md')).toBe(false);
    expect(isDetailMd('SPEC.md')).toBe(false);
    expect(isDetailMd('/app/README.md')).toBe(false);
    expect(isDetailMd('/app/spec.md')).toBe(false);
  });
});
