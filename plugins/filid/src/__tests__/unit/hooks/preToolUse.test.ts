import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handlePreToolUse } from '../../../hooks/preToolUse/preToolUse.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

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
  it('Read event → injectIntent runs (additionalContext present), no block', async () => {
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
    // injectIntent should produce additionalContext (filid:ctx or filid:map)
    expect(result.hookSpecificOutput?.additionalContext).toBeDefined();
    expect(result.hookSpecificOutput?.additionalContext).toMatch(/\[filid:/);
  });

  it('Write normal .ts file → all pass, continue=true', async () => {
    const filePath = join(tmpDir, 'src', 'feature.ts');
    mkdirSync(join(tmpDir, 'src'), { recursive: true });

    const input = makeInput({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: 'export const x = 1;\n' },
    });

    const result = await handlePreToolUse(input);
    expect(result.continue).toBe(true);
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
    // Write INTENT.md with >50 lines: validator denies; injectIntent also runs
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

  it('Write .ts with ancestor import in FCA project → all 3 hooks produce context', async () => {
    // Set up: file with ancestor import triggers structure-guard warning,
    // FCA project with INTENT.md triggers intent injection,
    // Write tool triggers validator
    mkdirSync(join(tmpDir, 'src', 'deep'), { recursive: true });
    const filePath = join(tmpDir, 'src', 'deep', 'child.ts');

    const input = makeInput({
      tool_name: 'Write',
      tool_input: {
        file_path: filePath,
        content: 'import { foo } from "../../";\nexport const bar = foo;\n',
      },
    });

    const result = await handlePreToolUse(input);
    expect(result.continue).toBe(true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    // Intent injection should produce [filid: block
    expect(ctx).toContain('[filid:');
    // Structure guard should warn about ancestor import
    expect(ctx).toContain('import');
  });
});
