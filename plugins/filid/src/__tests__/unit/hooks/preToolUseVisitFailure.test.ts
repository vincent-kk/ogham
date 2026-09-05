import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { commitVisit } from '../../../core/infra/cacheManager/caches/fractalMapCache.js';
import * as validator from '../../../hooks/preToolUse/helpers/preToolValidator/preToolValidator.js';
import * as structureGuard from '../../../hooks/preToolUse/helpers/structureGuard/structureGuard.js';
import { handlePreToolUse } from '../../../hooks/preToolUse/index.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

vi.mock(
  '../../../core/infra/cacheManager/caches/fractalMapCache.js',
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import('../../../core/infra/cacheManager/caches/fractalMapCache.js')
    >()),
    commitVisit: vi.fn(),
  }),
);

/** Fixture boundary whose projected Edit can cross the existing line cap. */
const INTENT_AT_CAP = Array.from({ length: 50 }, (_, i) => `line ${i}`).join(
  '\n',
);
/** Isolated project root assigned by the test lifecycle. */
let tmpDir: string;

/**
 * Build one logical operation in the isolated FCA project.
 * @param cwd - Existing fixture project root.
 * @param toolName - Logical operation whose visit cache fails.
 * @param toolInput - Path and mutation payload to validate after that failure.
 * @returns A valid PreToolUse envelope.
 */
function makeInput(
  cwd: string,
  toolName: string,
  toolInput: PreToolUseInput['tool_input'],
): PreToolUseInput {
  return {
    cwd,
    session_id: 'visit-failure-test',
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    tool_input: toolInput,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'filid-visit-failure-'));
  vi.stubEnv('CLAUDE_CONFIG_DIR', tmpDir);
  writeFileSync(
    join(tmpDir, 'package.json'),
    '{"name":"visit-failure-fixture"}',
  );
  writeFileSync(join(tmpDir, 'INTENT.md'), INTENT_AT_CAP);
  vi.mocked(commitVisit).mockImplementation(() => {
    throw new Error('visit cache unavailable');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('optional visit-cache failures', () => {
  it.each(['Write', 'Edit'] as const)(
    'keeps the INTENT %s denial after the cache throws',
    async (toolName) => {
      const result = await handlePreToolUse(
        makeInput(tmpDir, toolName, {
          file_path: 'INTENT.md',
          content: `${INTENT_AT_CAP}\noverflow`,
          old_string: 'line 0',
          new_string: 'line 0\noverflow',
        }),
      );

      expect(commitVisit).toHaveBeenCalledOnce();
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
        '50',
      );
    },
  );

  it('keeps a protected Delete denied after the cache throws', async () => {
    const result = await handlePreToolUse(
      makeInput(tmpDir, 'Delete', { file_path: 'INTENT.md' }),
    );

    expect(commitVisit).toHaveBeenCalledOnce();
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'Delete rejected',
    );
  });

  it('keeps DETAIL append-only validation after the cache throws', async () => {
    writeFileSync(join(tmpDir, 'DETAIL.md'), '# Contract\nExisting\n');

    const result = await handlePreToolUse(
      makeInput(tmpDir, 'Write', {
        file_path: 'DETAIL.md',
        content: '# Contract\nExisting\nAppended\n',
      }),
    );

    expect(commitVisit).toHaveBeenCalledOnce();
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('allows Read without optional visit context after the cache throws', async () => {
    const result = await handlePreToolUse(
      makeInput(tmpDir, 'Read', { file_path: 'INTENT.md' }),
    );

    expect(commitVisit).toHaveBeenCalledOnce();
    expect(result).toEqual({ continue: true });
  });

  it('preserves the structure warning on an allowed Write after the cache throws', async () => {
    mkdirSync(join(tmpDir, 'src', 'deep'), { recursive: true });
    writeFileSync(join(tmpDir, 'index.ts'), '');

    const result = await handlePreToolUse(
      makeInput(tmpDir, 'Write', {
        file_path: 'src/deep/child.ts',
        content: 'import { foo } from "../../";\nexport const bar = foo;\n',
      }),
    );

    expect(commitVisit).toHaveBeenCalledOnce();
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'structure-guard',
    );
  });

  it('does not turn validator errors into an allowed mutation', async () => {
    vi.spyOn(validator, 'validatePreToolUse').mockImplementationOnce(() => {
      throw new Error('validator unavailable');
    });

    await expect(
      handlePreToolUse(
        makeInput(tmpDir, 'Write', {
          file_path: 'INTENT.md',
          content: 'short',
        }),
      ),
    ).rejects.toThrow('validator unavailable');
    expect(commitVisit).toHaveBeenCalledOnce();
  });

  it('does not turn structure-guard errors into an allowed mutation', async () => {
    vi.spyOn(structureGuard, 'guardStructure').mockImplementationOnce(() => {
      throw new Error('structure guard unavailable');
    });

    await expect(
      handlePreToolUse(
        makeInput(tmpDir, 'Write', { file_path: 'ordinary.ts', content: '' }),
      ),
    ).rejects.toThrow('structure guard unavailable');
    expect(commitVisit).toHaveBeenCalledOnce();
  });
});
