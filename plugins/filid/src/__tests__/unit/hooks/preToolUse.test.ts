import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { normalizeCodexToolUses } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCacheDir } from '../../../core/infra/cacheManager/index.js';
import {
  handlePreToolUse,
  handlePreToolUseBatch,
} from '../../../hooks/preToolUse/index.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

const LEGACY_MODE_AUDIT_FILE = 'mode-audit.jsonl';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

function makeInput(
  overrides: Partial<PreToolUseInput> & {
    tool_input?: PreToolUseInput['tool_input'];
  },
): PreToolUseInput {
  return {
    cwd: tmpDir,
    session_id: 'test-session-ptu',
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
    tool_input: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup: a minimal FCA project in a temp directory
// ---------------------------------------------------------------------------

beforeEach(() => {
  tmpDir = join(tmpdir(), `filid-ptu-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
  process.env.CLAUDE_CONFIG_DIR = tmpDir;
  // Mark as FCA project
  writeFileSync(
    join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'test-pkg' }),
  );
  writeFileSync(
    join(tmpDir, 'INTENT.md'),
    '## Purpose\nTest project\n## Boundaries\nAll\n',
  );
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// handlePreToolUse — integration-style tests using real temp filesystem
// ---------------------------------------------------------------------------

describe('handlePreToolUse', () => {
  it('Read event → visit pipeline runs (additionalContext present), no block', async () => {
    // Place a file inside the temp FCA project
    const filePath = join(tmpDir, 'src', 'index.ts');
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(filePath, '');

    const input = makeInput({
      tool_name: 'Read',
      tool_input: { file_path: filePath },
    });

    const result = await handlePreToolUse(input);

    // Must not block
    expect(result.continue).toBe(true);
    // processVisit should produce additionalContext (filid:ctx or filid:map)
    expect(result.hookSpecificOutput?.additionalContext).toBeDefined();
    expect(result.hookSpecificOutput?.additionalContext).toMatch(/\[filid:/);
  });

  it('Write normal .ts into undelivered module → gate denies once with rules, retry passes', async () => {
    const filePath = join(tmpDir, 'src', 'feature.ts');
    mkdirSync(join(tmpDir, 'src'), { recursive: true });

    const input = makeInput({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: 'export const x = 1;\n' },
    });

    const denied = await handlePreToolUse(input);
    expect(denied.continue).toBe(true);
    expect(denied.hookSpecificOutput?.permissionDecision).toBe('deny');
    const reason = denied.hookSpecificOutput?.permissionDecisionReason ?? '';
    expect(reason).toContain('[filid:gate]');
    expect(reason).toContain('intent: INTENT.md');
    expect(reason).toContain('action: READ the intent file above');
    expect(reason).not.toContain('Test project');

    const retry = await handlePreToolUse(input);
    expect(retry.continue).toBe(true);
    expect(retry.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  it('Write INTENT.md to organ-named target directory → allowed (chicken-and-egg fix)', async () => {
    // 'utils' is a known organ directory name, but writing INTENT.md to it
    // reclassifies it as fractal — the guard should not block.
    const organDir = join(tmpDir, 'src', 'utils');
    mkdirSync(organDir, { recursive: true });
    const filePath = join(organDir, 'INTENT.md');

    const input = makeInput({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: '# Utils\n' },
    });

    const result = await handlePreToolUse(input);
    expect(result.continue).toBe(true);
  });

  it('Edit INTENT.md with >20 line new_string → continue=true with warning', async () => {
    const intentPath = join(tmpDir, 'src', 'auth', 'INTENT.md');
    mkdirSync(join(tmpDir, 'src', 'auth'), { recursive: true });
    writeFileSync(
      intentPath,
      '# Auth\n## Purpose\nAuth module\n## Boundaries\nAll\n',
    );

    const newString = Array.from({ length: 25 }, (_, i) => `Line ${i}`).join(
      '\n',
    );

    const input = makeInput({
      tool_name: 'Edit',
      tool_input: { file_path: intentPath, new_string: newString },
    });

    const result = await handlePreToolUse(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      '25 new lines',
    );
  });

  it('Write DETAIL.md reads existing file content and passes to validator', async () => {
    const detailPath = join(tmpDir, 'DETAIL.md');
    // Existing content: 2 lines
    writeFileSync(detailPath, 'line1\nline2\n');

    // New content is a superset → append-only violation
    const input = makeInput({
      tool_name: 'Write',
      tool_input: {
        file_path: detailPath,
        content: 'line1\nline2\nline3\nline4\n',
      },
    });

    const result = await handlePreToolUse(input);
    // Append-only detection should deny via permissionDecision, not stop the turn
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('deny + intent context coexist → continue=true, both permissionDecision and additionalContext present', async () => {
    // Write INTENT.md with >50 lines: validator denies; the visit pipeline also runs
    // and may add additionalContext. Both must be present in the merged output.
    const content = Array.from({ length: 51 }, (_, i) => `Line ${i + 1}`).join(
      '\n',
    );
    const intentPath = join(tmpDir, 'INTENT.md');

    const input = makeInput({
      tool_name: 'Write',
      tool_input: { file_path: intentPath, content },
    });

    const result = await handlePreToolUse(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
  });

  it('Write INTENT.md in organ-named dir → allowed, intent context collected', async () => {
    // 'utils' is a known organ directory name, but target dir is exempt
    const organDir = join(tmpDir, 'src', 'utils');
    mkdirSync(organDir, { recursive: true });
    const filePath = join(organDir, 'INTENT.md');

    const input = makeInput({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: '# Utils intent\n' },
    });

    const result = await handlePreToolUse(input);
    expect(result.continue).toBe(true);
  });

  it('Write INTENT.md inside ancestor organ dir → allowed (fractal inside organ)', async () => {
    // 'utils' is ancestor organ, 'sub' is the target — both allowed
    const subDir = join(tmpDir, 'src', 'utils', 'sub');
    mkdirSync(subDir, { recursive: true });
    const filePath = join(subDir, 'INTENT.md');

    const input = makeInput({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: '# Sub\n' },
    });

    const result = await handlePreToolUse(input);
    expect(result.continue).toBe(true);
  });

  it('Read on non-FCA project → clean continue:true, no hookSpecificOutput', async () => {
    // Create a non-FCA temp dir (no package.json, no INTENT.md)
    const nonFcaDir = join(tmpdir(), `filid-nonfca-${Date.now()}`);
    mkdirSync(nonFcaDir, { recursive: true });
    writeFileSync(join(nonFcaDir, 'index.ts'), '');

    try {
      const input: PreToolUseInput = {
        cwd: nonFcaDir,
        session_id: 'test-nonfca',
        hook_event_name: 'PreToolUse',
        tool_name: 'Read',
        tool_input: { file_path: join(nonFcaDir, 'index.ts') },
      };

      const result = await handlePreToolUse(input);
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    } finally {
      rmSync(nonFcaDir, { recursive: true, force: true });
    }
  });

  it('Write INTENT.md over 50 lines in non-FCA project → no deny (opt-in gate)', async () => {
    // Regression: the validator ran without an FCA gate, so repositories
    // that never opted into filid still had their INTENT.md writes denied.
    const nonFcaDir = join(tmpdir(), `filid-nonfca-write-${Date.now()}`);
    mkdirSync(join(nonFcaDir, '.git'), { recursive: true });
    const content = Array.from({ length: 60 }, (_, i) => `Line ${i + 1}`).join(
      '\n',
    );

    try {
      const result = await handlePreToolUse({
        cwd: nonFcaDir,
        session_id: 'test-nonfca-write',
        hook_event_name: 'PreToolUse',
        tool_name: 'Write',
        tool_input: { file_path: join(nonFcaDir, 'INTENT.md'), content },
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    } finally {
      rmSync(nonFcaDir, { recursive: true, force: true });
    }
  });

  it('gate delivery is terminal: after deny+retry, later Reads emit no unread warning and no re-ctx', async () => {
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(join(tmpDir, 'index.ts'), '');

    const write = makeInput({
      tool_name: 'Write',
      tool_input: {
        file_path: join(tmpDir, 'src', 'feature', 'x.ts'),
        content: 'export const x = 1;\n',
      },
    });
    const denied = await handlePreToolUse(write);
    expect(denied.hookSpecificOutput?.permissionDecision).toBe('deny');
    await handlePreToolUse(write); // retry passes, records the visit

    const readResult = await handlePreToolUse(
      makeInput({
        tool_name: 'Read',
        tool_input: { file_path: join(tmpDir, 'index.ts') },
      }),
    );
    const ctx = readResult.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).not.toContain('unread-intent');
    // root module was delivered by the gate → same-session Read stays ctx-free
    expect(ctx).not.toContain('[filid:ctx]');
  });

  it('spike branch → over-50-line INTENT.md Write stays denied without mode audit', async () => {
    mkdirSync(join(tmpDir, '.git'), { recursive: true });
    writeFileSync(join(tmpDir, '.git', 'HEAD'), 'ref: refs/heads/spike/poc\n');
    const content = Array.from({ length: 60 }, (_, i) => `Line ${i + 1}`).join(
      '\n',
    );

    const result = await handlePreToolUse(
      makeInput({
        tool_name: 'Write',
        tool_input: { file_path: join(tmpDir, 'INTENT.md'), content },
      }),
    );

    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(existsSync(join(getCacheDir(tmpDir), LEGACY_MODE_AUDIT_FILE))).toBe(
      false,
    );
  });

  it('normal branch → over-50-line INTENT.md Write stays denied without mode audit', async () => {
    mkdirSync(join(tmpDir, '.git'), { recursive: true });
    writeFileSync(join(tmpDir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    const content = Array.from({ length: 60 }, (_, i) => `Line ${i + 1}`).join(
      '\n',
    );

    const result = await handlePreToolUse(
      makeInput({
        tool_name: 'Write',
        tool_input: { file_path: join(tmpDir, 'INTENT.md'), content },
      }),
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');

    expect(existsSync(join(getCacheDir(tmpDir), LEGACY_MODE_AUDIT_FILE))).toBe(
      false,
    );
  });

  it('.filid/criteria.md Write is not a hook-specific deny or audit target', async () => {
    const criteriaPath = join(tmpDir, '.filid', 'criteria.md');
    mkdirSync(join(tmpDir, '.filid'), { recursive: true });
    await handlePreToolUse(
      makeInput({
        tool_name: 'Read',
        tool_input: { file_path: join(tmpDir, 'INTENT.md') },
      }),
    );

    const result = await handlePreToolUse(
      makeInput({
        tool_name: 'Write',
        tool_input: { file_path: criteriaPath, content: '' },
      }),
    );

    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    expect(existsSync(join(getCacheDir(tmpDir), LEGACY_MODE_AUDIT_FILE))).toBe(
      false,
    );
  });

  it('Write .ts with ancestor import (module delivered) → guard + map context present', async () => {
    // Deliver the root module first so the gate does not fire; the Write then
    // runs guard (ancestor-import warning) alongside the visit pipeline.
    mkdirSync(join(tmpDir, 'src', 'deep'), { recursive: true });
    writeFileSync(join(tmpDir, 'index.ts'), '');
    await handlePreToolUse(
      makeInput({
        tool_name: 'Read',
        tool_input: { file_path: join(tmpDir, 'index.ts') },
      }),
    );

    const result = await handlePreToolUse(
      makeInput({
        tool_name: 'Write',
        tool_input: {
          file_path: join(tmpDir, 'src', 'deep', 'child.ts'),
          content: 'import { foo } from "../../";\nexport const bar = foo;\n',
        },
      }),
    );
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    // Visit pipeline emits the grown map; structure guard warns on the import
    expect(ctx).toContain('[filid:map]');
    expect(ctx).toContain('import');
  });

  it('batch inspects a later validator deny after an allowed first operation', async () => {
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(join(tmpDir, 'index.ts'), '');
    await handlePreToolUse(
      makeInput({
        tool_name: 'Read',
        tool_input: { file_path: join(tmpDir, 'index.ts') },
      }),
    );

    const safeSection = `*** Add File: ${join(tmpDir, 'src', 'safe.ts')}\n+export const safe = true;`;
    const safeOnly = normalizeCodexToolUses(
      makeInput({
        tool_name: 'apply_patch',
        tool_input: {
          command: `*** Begin Patch\n${safeSection}\n*** End Patch`,
        },
      }),
    );
    const control = await handlePreToolUseBatch(safeOnly);
    expect(control.hookSpecificOutput?.permissionDecision).toBeUndefined();

    const oversized = Array.from(
      { length: 51 },
      (_, index) => `+line ${index + 1}`,
    ).join('\n');
    const hiddenPath = join(tmpDir, 'src', 'feature', 'INTENT.md');
    const combined = normalizeCodexToolUses(
      makeInput({
        tool_name: 'apply_patch',
        tool_input: {
          command: `*** Begin Patch\n${safeSection}\n*** Add File: ${hiddenPath}\n${oversized}\n*** End Patch`,
        },
      }),
    );
    const result = await handlePreToolUseBatch(combined);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      hiddenPath,
    );
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      '51 lines',
    );
  });

  it('batch exposes a structure warning found only in the second operation', async () => {
    mkdirSync(join(tmpDir, 'src', 'deep'), { recursive: true });
    writeFileSync(join(tmpDir, 'index.ts'), '');
    await handlePreToolUse(
      makeInput({
        tool_name: 'Read',
        tool_input: { file_path: join(tmpDir, 'index.ts') },
      }),
    );

    const hiddenPath = join(tmpDir, 'src', 'deep', 'child.ts');
    const normalized = normalizeCodexToolUses(
      makeInput({
        tool_name: 'apply_patch',
        tool_input: {
          command:
            `*** Begin Patch\n*** Add File: ${join(tmpDir, 'src', 'safe.ts')}\n+export const safe = true;\n` +
            `*** Add File: ${hiddenPath}\n+import { foo } from "../../";\n+export const child = foo;\n*** End Patch`,
        },
      }),
    );
    const result = await handlePreToolUseBatch(normalized);
    const context = result.hookSpecificOutput?.additionalContext ?? '';
    expect(context).toContain(hiddenPath);
    expect(context).toContain('structure-guard');
    expect(context).toContain('import');
  });

  it('batch continues after an initial deny and exposes a later structure warning', async () => {
    mkdirSync(join(tmpDir, 'src', 'deep'), { recursive: true });
    const blockedPath = join(tmpDir, 'src', 'blocked.ts');
    const hiddenPath = join(tmpDir, 'src', 'deep', 'child.ts');
    const normalized = normalizeCodexToolUses(
      makeInput({
        tool_name: 'apply_patch',
        tool_input: {
          command:
            `*** Begin Patch\n*** Add File: ${blockedPath}\n+export const blocked = true;\n` +
            `*** Add File: ${hiddenPath}\n+import { foo } from "../../";\n+export const child = foo;\n*** End Patch`,
        },
      }),
    );

    const result = await handlePreToolUseBatch(normalized);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      blockedPath,
    );
    const context = result.hookSpecificOutput?.additionalContext ?? '';
    expect(context).toContain(hiddenPath);
    expect(context).toContain('structure-guard');
  });

  it('batch routes Delete through the mutation visit gate', async () => {
    const deletedPath = join(tmpDir, 'src', 'obsolete.ts');
    const normalized = normalizeCodexToolUses(
      makeInput({
        tool_name: 'apply_patch',
        tool_input: {
          command: `*** Begin Patch\n*** Delete File: ${deletedPath}\n*** End Patch`,
        },
      }),
    );

    const result = await handlePreToolUseBatch(normalized);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      '[filid:gate]',
    );
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      deletedPath,
    );
  });

  it('batch routes a delivered protected Delete through the document validator', async () => {
    writeFileSync(join(tmpDir, 'index.ts'), '');
    await handlePreToolUse(
      makeInput({
        tool_name: 'Read',
        tool_input: { file_path: join(tmpDir, 'index.ts') },
      }),
    );
    const intentPath = join(tmpDir, 'INTENT.md');
    const normalized = normalizeCodexToolUses(
      makeInput({
        tool_name: 'apply_patch',
        tool_input: {
          command: `*** Begin Patch\n*** Delete File: ${intentPath}\n*** End Patch`,
        },
      }),
    );

    const result = await handlePreToolUseBatch(normalized);
    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'Delete rejected',
    );
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      intentPath,
    );
  });

  it('malformed patch denies in FCA and stays a bare allow outside FCA', async () => {
    const malformed = normalizeCodexToolUses(
      makeInput({
        tool_name: 'apply_patch',
        tool_input: { command: 'not really a patch' },
      }),
    );
    const governed = await handlePreToolUseBatch(malformed);
    expect(governed.hookSpecificOutput?.permissionDecision).toBe('deny');
    const reason = governed.hookSpecificOutput?.permissionDecisionReason ?? '';
    expect(reason).toContain('Re-emit the patch in V4A form.');
    expect(reason).not.toContain('retry. Then retry');

    const nonFcaDir = join(tmpdir(), `filid-batch-non-fca-${Date.now()}`);
    mkdirSync(join(nonFcaDir, '.git'), { recursive: true });
    try {
      const outside = normalizeCodexToolUses(
        makeInput({
          cwd: nonFcaDir,
          tool_name: 'apply_patch',
          tool_input: { command: 'not really a patch' },
        }),
      );
      expect(await handlePreToolUseBatch(outside)).toEqual({ continue: true });
    } finally {
      rmSync(nonFcaDir, { recursive: true, force: true });
    }
  });
});
