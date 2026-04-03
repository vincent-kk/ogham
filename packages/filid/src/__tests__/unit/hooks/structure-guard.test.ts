import { describe, expect, it } from 'vitest';

import { guardStructure } from '../../../hooks/structure-guard.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

const baseInput: PreToolUseInput = {
  cwd: '/workspace',
  session_id: 'test-session',
  hook_event_name: 'PreToolUse',
  tool_name: 'Write',
  tool_input: {},
};

describe('structure-guard', () => {
  it('should allow INTENT.md in organ-named directory with reclassification warning', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { file_path: '/app/src/utils/INTENT.md', content: '# Utils' },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('reclassify it as fractal');
  });

  it('should allow INTENT.md in nested organ directories with warning', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/app/src/components/ui/INTENT.md',
        content: '# UI',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('reclassify it as fractal');
  });

  it('should allow INTENT.md in fractal directories', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { file_path: '/app/src/auth/INTENT.md', content: '# Auth' },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
  });

  it('should allow non-INTENT.md files in organ directories', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/app/src/utils/helper.ts',
        content: 'export {}',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
  });

  it('should pass through Edit tool calls for INTENT.md', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_name: 'Edit',
      tool_input: {
        file_path: '/app/src/utils/INTENT.md',
        new_string: 'updated',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
  });

  it('should allow INTENT.md in all known organ-named target directories', () => {
    const organDirs = [
      'components',
      'utils',
      'types',
      'hooks',
      'helpers',
      'lib',
      'styles',
      'assets',
      'constants',
    ];
    for (const dir of organDirs) {
      const input: PreToolUseInput = {
        ...baseInput,
        tool_input: { file_path: `/app/src/${dir}/INTENT.md`, content: '# X' },
      };
      const result = guardStructure(input);
      expect(result.continue, `Expected allow for target organ dir: ${dir}`).toBe(
        true,
      );
    }
  });

  it('should allow INTENT.md even when ancestor is organ (fractal inside organ)', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/app/src/utils/sub-module/INTENT.md',
        content: '# Sub',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
  });

  it('should allow root-relative INTENT.md in organ-named target directory', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: { file_path: 'utils/INTENT.md', content: '# Utils' },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
  });

  it('should warn on organ nesting (subdirectory creation)', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/app/src/utils/deep/nested/helper.ts',
        content: 'export {}',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('organ directory');
  });

  it('should pass through non-Write/Edit tool calls', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_name: 'Read',
      tool_input: { file_path: '/app/src/utils/INTENT.md' },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
  });
});
