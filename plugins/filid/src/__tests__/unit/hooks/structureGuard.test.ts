import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { guardStructure } from '../../../hooks/preToolUse/helpers/structureGuard/structureGuard.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

const baseInput: PreToolUseInput = {
  cwd: '/workspace',
  session_id: 'test-session',
  hook_event_name: 'PreToolUse',
  tool_name: 'Write',
  tool_input: {},
};

// Paths under cwd that do not exist on disk exercise the name-based organ
// fallback (the intended branch for not-yet-created directories).

describe('structure-guard', () => {
  it('should allow INTENT.md in organ-named directory with reclassification warning', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/workspace/src/utils/INTENT.md',
        content: '# Utils',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'reclassified from organ to fractal',
    );
  });

  it('should allow INTENT.md in nested organ directories with info', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/workspace/src/components/ui/INTENT.md',
        content: '# UI',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'reclassified from organ to fractal',
    );
  });

  it('should allow INTENT.md in fractal directories', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/workspace/src/auth/INTENT.md',
        content: '# Auth',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
  });

  it('should allow non-INTENT.md files in organ directories', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/workspace/src/utils/helper.ts',
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
        file_path: '/workspace/src/utils/INTENT.md',
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
        tool_input: {
          file_path: `/workspace/src/${dir}/INTENT.md`,
          content: '# X',
        },
      };
      const result = guardStructure(input);
      expect(
        result.continue,
        `Expected allow for target organ dir: ${dir}`,
      ).toBe(true);
    }
  });

  it('should allow INTENT.md even when ancestor is organ (fractal inside organ)', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/workspace/src/utils/sub-module/INTENT.md',
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
        file_path: '/workspace/src/utils/deep/nested/helper.ts',
        content: 'export {}',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'organ directory',
    );
  });

  it('should pass through non-Write/Edit tool calls', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_name: 'Read',
      tool_input: { file_path: '/workspace/src/utils/INTENT.md' },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
  });

  it('should skip checks entirely for paths outside cwd (absolute-path regression)', () => {
    // Regression: absolute paths were split into raw segments and re-joined
    // onto cwd, so organ names anywhere in the path (even above the project)
    // produced warnings. Outside-cwd targets must not be checked at all.
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/elsewhere/fixtures/utils/deep/INTENT.md',
        content: '# X',
      },
    };
    const result = guardStructure(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  describe('structure-based correction (real filesystem)', () => {
    let tmpCwd: string;

    beforeEach(() => {
      tmpCwd = join(
        tmpdir(),
        `filid-guard-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      mkdirSync(join(tmpCwd, 'src', 'hooks', 'probe'), { recursive: true });
    });

    afterEach(() => {
      rmSync(tmpCwd, { recursive: true, force: true });
    });

    it('organ-named dir WITH INTENT.md is a fractal → no nesting warning', () => {
      // src/hooks carries INTENT.md → classification priority 1 (fractal)
      // must beat the KNOWN_ORGAN_DIR_NAMES name match.
      writeFileSync(join(tmpCwd, 'src', 'hooks', 'INTENT.md'), '# hooks\n');

      const result = guardStructure({
        ...baseInput,
        cwd: tmpCwd,
        tool_input: {
          file_path: join(tmpCwd, 'src', 'hooks', 'probe', 'probe.ts'),
          content: 'export {}',
        },
      });
      expect(result.continue).toBe(true);
      expect(
        result.hookSpecificOutput?.additionalContext ?? '',
      ).not.toContain('organ directory');
    });
  });
});
