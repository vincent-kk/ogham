import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validatePreToolUse } from '../../../hooks/preToolUse/helpers/preToolValidator/index.js';
import { isDetailMd } from '../../../hooks/shared/index.js';
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
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toMatch(
      /Compress, deduplicate, or move detailed content to DETAIL\.md/,
    );
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
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toMatch(
      /Rewrite it to the current state/,
    );
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

  it('should pass .filid/criteria.md through without a hook-specific decision', () => {
    const input: PreToolUseInput = {
      ...baseInput,
      tool_input: {
        file_path: '/repo/.filid/criteria.md',
        content: '',
      },
    };
    const result = validatePreToolUse(input);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it.each(['/app/INTENT.md', '/app/DETAIL.md'])(
    'should block Delete of protected document %s',
    (filePath) => {
      const result = validatePreToolUse({
        ...baseInput,
        tool_name: 'Delete',
        tool_input: { file_path: filePath },
      });
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
        'Delete',
      );
    },
  );
});

describe('protected document demotion', () => {
  /** Temporary project whose config and directory entries drive deletion. */
  let projectRoot: string;
  /** Directory retaining its contract documents until the Delete operation. */
  let directory: string;

  beforeEach(() => {
    projectRoot = realpathSync.native(
      mkdtempSync(join(tmpdir(), 'filid-demotion-')),
    );
    directory = join(projectRoot, 'module');
    mkdirSync(directory);
    mkdirSync(join(projectRoot, '.filid'));
    writeFileSync(join(projectRoot, '.filid/config.json'), '{}');
    writeFileSync(join(directory, 'INTENT.md'), '# Contract');
    writeFileSync(join(directory, 'DETAIL.md'), '# Contract');
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it.each(['index.ts', 'main.ts', 'page.tsx', 'package.json'])(
    'denies deletion while the %s entry point remains',
    (entry) => {
      writeFileSync(join(directory, entry), '');
      const result = validatePreToolUse({
        ...baseInput,
        cwd: projectRoot,
        tool_name: 'Delete',
        tool_input: { file_path: join(directory, 'INTENT.md') },
      });
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
        'To demote this fractal to an organ',
      );
    },
  );

  it('denies deletion while a declared override entry file remains', () => {
    writeFileSync(
      join(projectRoot, '.filid/config.json'),
      JSON.stringify({
        structure: { entryPointOverrides: { ecmascript: ['custom.entry.ts'] } },
      }),
    );
    writeFileSync(join(directory, 'custom.entry.ts'), '');
    const result = validatePreToolUse({
      ...baseInput,
      cwd: projectRoot,
      tool_name: 'Delete',
      tool_input: { file_path: join(directory, 'INTENT.md') },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'To demote this fractal to an organ',
    );
  });

  it('allows demotion when a declared override names a file absent here', () => {
    writeFileSync(
      join(projectRoot, '.filid/config.json'),
      JSON.stringify({
        structure: { entryPointOverrides: { ecmascript: ['custom.entry.ts'] } },
      }),
    );
    const result = validatePreToolUse({
      ...baseInput,
      cwd: projectRoot,
      tool_name: 'Delete',
      tool_input: { file_path: join(directory, 'INTENT.md') },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
  });

  it.each(['INTENT.md', 'DETAIL.md'])(
    'allows demotion by deleting %s when no entry point remains',
    (file) => {
      const result = validatePreToolUse({
        ...baseInput,
        cwd: projectRoot,
        tool_name: 'Delete',
        tool_input: { file_path: join(directory, file) },
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
      expect(result.hookSpecificOutput?.additionalContext).toBe(
        `Demotion: ${directory} has no entry point, so deleting ${file} drops its fractal claim. Record the demotion in the parent DETAIL.md.`,
      );
    },
  );

  it('denies deletion of a symlinked DETAIL.md without an entry point', () => {
    const documentPath = join(directory, 'DETAIL.md');
    const targetPath = join(projectRoot, 'contract.md');
    writeFileSync(targetPath, '# Contract');
    rmSync(documentPath);
    symlinkSync(targetPath, documentPath);

    const result = validatePreToolUse({
      ...baseInput,
      cwd: projectRoot,
      tool_name: 'Delete',
      tool_input: { file_path: documentPath },
    });

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'To demote this fractal to an organ',
    );
  });

  it('denies deletion when the directory cannot be read', () => {
    rmSync(directory, { recursive: true });
    const result = validatePreToolUse({
      ...baseInput,
      cwd: projectRoot,
      tool_name: 'Delete',
      tool_input: { file_path: join(directory, 'DETAIL.md') },
    });
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'To demote this fractal to an organ',
    );
  });

  it.each(['missing', 'invalid JSON'])(
    'denies deletion when config is %s',
    (state) => {
      const configPath = join(projectRoot, '.filid/config.json');
      if (state === 'missing') rmSync(configPath);
      else writeFileSync(configPath, '{');
      const result = validatePreToolUse({
        ...baseInput,
        cwd: projectRoot,
        tool_name: 'Delete',
        tool_input: { file_path: join(directory, 'DETAIL.md') },
      });
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
        'To demote this fractal to an organ',
      );
    },
  );
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
