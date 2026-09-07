import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { normalizeCodexToolUses } from '@ogham/cross-platform';
import {
  type TestContext,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { validatePreToolUse } from '../../../hooks/preToolUse/helpers/preToolValidator/index.js';
import {
  handlePreToolUse,
  handlePreToolUseBatch,
} from '../../../hooks/preToolUse/index.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

/** Existing boundary at the cap; replacing its first line can exceed it. */
const INTENT_AT_CAP = Array.from({ length: 50 }, (_, i) => `line ${i}`).join(
  '\n',
);
/** Current DETAIL content whose unchanged prefix exposes append-only writes. */
const DETAIL_CONTENT = '# Contract\nExisting requirement\n';
/** Host errors that mean a real symlink fixture cannot be created. */
const UNSUPPORTED_SYMLINK_CODES = new Set(['EPERM', 'ENOSYS', 'ENOTSUP']);
/** Isolated project root assigned by the test lifecycle. */
let tmpDir: string;
/** Current case's explicit skip mechanism, supplied by Vitest beforeEach. */
let skipUnsupported: TestContext['skip'];

/**
 * Build one logical tool request without altering its supplied path spelling.
 * @param cwd - Existing fixture project root.
 * @param toolName - Logical hook operation to exercise.
 * @param toolInput - Path and mutation payload passed to the host hook.
 * @returns A valid PreToolUse envelope for that operation.
 */
function makeInput(
  cwd: string,
  toolName: string,
  toolInput: PreToolUseInput['tool_input'],
): PreToolUseInput {
  return {
    cwd,
    session_id: 'path-alias-test',
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    tool_input: toolInput,
  };
}

/**
 * Create a real file alias or report an unsupported host through Vitest.
 * @param target - Existing or missing file target, relative to the alias or absolute.
 * @param alias - Unused symlink path inside the fixture project.
 * @param skip - Vitest's explicit skip mechanism for unsupported filesystems.
 * @returns Nothing; unexpected filesystem failures propagate.
 */
function createSymlink(
  target: string,
  alias: string,
  skip: TestContext['skip'],
): void {
  try {
    symlinkSync(target, alias, 'file');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code ?? '';
    if (!UNSUPPORTED_SYMLINK_CODES.has(code)) throw error;
    skip('The host filesystem cannot create file symlink fixtures.');
  }
}

beforeEach(({ skip }) => {
  skipUnsupported = skip;
  tmpDir = mkdtempSync(join(tmpdir(), 'filid-path-alias-'));
  vi.stubEnv('CLAUDE_CONFIG_DIR', tmpDir);
  writeFileSync(join(tmpDir, 'package.json'), '{"name":"path-alias-fixture"}');
  writeFileSync(join(tmpDir, 'INTENT.md'), INTENT_AT_CAP);
  writeFileSync(join(tmpDir, 'DETAIL.md'), DETAIL_CONTENT);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('host case aliases', () => {
  it.each(['Write', 'Edit'] as const)(
    'denies over-cap INTENT %s through a real case alias',
    (toolName) => {
      const alias = join(tmpDir, 'intent.md');
      if (!existsSync(alias))
        skipUnsupported(
          'The host filesystem treats differently cased names as separate files.',
        );
      const target = statSync(join(tmpDir, 'INTENT.md'));
      expect(statSync(alias)).toMatchObject({
        dev: target.dev,
        ino: target.ino,
      });

      const result = validatePreToolUse(
        makeInput(tmpDir, toolName, {
          file_path: 'intent.md',
          content: `${INTENT_AT_CAP}\noverflow`,
          old_string: 'line 0',
          new_string: 'line 0\noverflow',
        }),
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
        '50',
      );
    },
  );

  it('validates supplied DETAIL content through a real case alias', ({
    skip,
  }) => {
    const alias = join(tmpDir, 'detail.md');
    if (!existsSync(alias))
      skip('The host filesystem does not resolve this DETAIL case alias.');

    const result = validatePreToolUse(
      makeInput(tmpDir, 'Write', {
        file_path: alias,
        content: `${DETAIL_CONTENT}Appended requirement\n`,
      }),
      DETAIL_CONTENT,
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('reads prior DETAIL content through a real case alias', async ({
    skip,
  }) => {
    const alias = join(tmpDir, 'detail.md');
    if (!existsSync(alias))
      skip('The host filesystem does not resolve this DETAIL case alias.');

    const result = await handlePreToolUse(
      makeInput(tmpDir, 'Write', {
        path: 'detail.md',
        content: `${DETAIL_CONTENT}Appended requirement\n`,
      }),
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it.each(['intent.md', 'detail.md'])(
    'leaves a separate lowercase file %s outside the document gate',
    (documentName) => {
      const target = join(tmpDir, documentName);
      if (existsSync(target))
        skipUnsupported(
          'The host filesystem aliases lowercase names to the existing documents.',
        );
      writeFileSync(target, 'Ordinary file');

      const result = validatePreToolUse(
        makeInput(tmpDir, 'Write', {
          file_path: target,
          content:
            documentName === 'intent.md'
              ? `${INTENT_AT_CAP}\noverflow`
              : `${DETAIL_CONTENT}Appended requirement\n`,
        }),
        DETAIL_CONTENT,
      );

      expect(result).toEqual({ continue: true });
    },
  );
});

describe('physical symlink targets', () => {
  it('denies a Write through a dangling symlink that creates INTENT', async ({
    skip,
  }) => {
    mkdirSync(join(tmpDir, 'child'));
    const target = join(tmpDir, 'child', 'INTENT.md');
    const alias = join(tmpDir, 'draft.md');
    createSymlink('child/INTENT.md', alias, skip);
    const content = `${INTENT_AT_CAP}\noverflow`;
    expect(existsSync(target)).toBe(false);

    const result = await handlePreToolUse(
      makeInput(tmpDir, 'Write', { file_path: alias, content }),
    );
    writeFileSync(alias, content);

    expect(readFileSync(target, 'utf-8')).toBe(content);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('50');
  });

  it('uses an ordinary missing referent behind an INTENT-named symlink', ({
    skip,
  }) => {
    mkdirSync(join(tmpDir, 'child'));
    const target = join(tmpDir, 'ordinary.md');
    const alias = join(tmpDir, 'child', 'INTENT.md');
    createSymlink('../ordinary.md', alias, skip);
    const content = `${INTENT_AT_CAP}\noverflow`;
    expect(existsSync(target)).toBe(false);

    const result = validatePreToolUse(
      makeInput(tmpDir, 'Write', { file_path: alias, content }),
    );
    writeFileSync(alias, content);

    expect(readFileSync(target, 'utf-8')).toBe(content);
    expect(result).toEqual({ continue: true });
  });

  it.each(['Write', 'Edit'] as const)(
    'denies over-cap INTENT %s through an ordinary symlink name',
    (toolName) => {
      const alias = join(tmpDir, 'boundary-alias.md');
      createSymlink(join(tmpDir, 'INTENT.md'), alias, skipUnsupported);

      const result = validatePreToolUse(
        makeInput(tmpDir, toolName, {
          file_path: alias,
          content: `${INTENT_AT_CAP}\noverflow`,
          old_string: 'line 0',
          new_string: 'line 0\noverflow',
        }),
      );

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
        '50',
      );
    },
  );

  it('validates supplied DETAIL content through a symlink alias', ({
    skip,
  }) => {
    const alias = join(tmpDir, 'contract-alias.md');
    createSymlink(join(tmpDir, 'DETAIL.md'), alias, skip);

    const result = validatePreToolUse(
      makeInput(tmpDir, 'Write', {
        file_path: alias,
        content: `${DETAIL_CONTENT}Appended requirement\n`,
      }),
      DETAIL_CONTENT,
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('reads prior DETAIL content through a symlink alias', async ({ skip }) => {
    const alias = join(tmpDir, 'contract-alias.md');
    createSymlink(join(tmpDir, 'DETAIL.md'), alias, skip);

    const result = await handlePreToolUse(
      makeInput(tmpDir, 'Write', {
        file_path: alias,
        content: `${DETAIL_CONTENT}Appended requirement\n`,
      }),
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it.each(['Write', 'Edit'] as const)(
    'uses the ordinary referent of an INTENT-named symlink for %s',
    (toolName) => {
      const target = join(tmpDir, 'ordinary.md');
      writeFileSync(target, INTENT_AT_CAP);
      mkdirSync(join(tmpDir, 'child'));
      const alias = join(tmpDir, 'child', 'INTENT.md');
      createSymlink(target, alias, skipUnsupported);

      const result = validatePreToolUse(
        makeInput(tmpDir, toolName, {
          file_path: alias,
          content: `${INTENT_AT_CAP}\noverflow`,
          old_string: 'line 0',
          new_string: 'line 0\noverflow',
        }),
      );

      expect(result).toEqual({ continue: true });
    },
  );

  it('allows Delete to unlink an ordinary-named alias of INTENT', ({
    skip,
  }) => {
    const alias = join(tmpDir, 'boundary-alias.md');
    createSymlink(join(tmpDir, 'INTENT.md'), alias, skip);

    const result = validatePreToolUse(
      makeInput(tmpDir, 'Delete', { file_path: alias }),
    );

    expect(result).toEqual({ continue: true });
  });

  it('protects the INTENT terminal entry when Delete would unlink it', ({
    skip,
  }) => {
    const target = join(tmpDir, 'ordinary.md');
    writeFileSync(target, 'Ordinary file');
    mkdirSync(join(tmpDir, 'child'));
    const alias = join(tmpDir, 'child', 'INTENT.md');
    createSymlink(target, alias, skip);

    const result = validatePreToolUse(
      makeInput(tmpDir, 'Delete', { file_path: alias }),
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'Delete rejected',
    );
  });

  it('requires exact Move content for a contract destination alias', async ({
    skip,
  }) => {
    writeFileSync(join(tmpDir, 'draft.md'), 'same\nmiddle\nsame\n');
    const alias = join(tmpDir, 'boundary-alias.md');
    createSymlink(join(tmpDir, 'INTENT.md'), alias, skip);
    const input = makeInput(tmpDir, 'apply_patch', {
      command:
        '*** Begin Patch\n*** Update File: draft.md\n*** Move to: boundary-alias.md\n@@\n-same\n+changed\n*** End Patch',
    });

    const result = await handlePreToolUseBatch(normalizeCodexToolUses(input));

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'needs exact content',
    );
  });
});
