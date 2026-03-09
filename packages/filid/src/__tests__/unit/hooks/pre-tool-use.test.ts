import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handlePreToolUse, mergeResults } from '../../../hooks/pre-tool-use.js';
import type { HookOutput, PreToolUseInput } from '../../../types/hooks.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

function makeInput(overrides: Partial<PreToolUseInput> & { tool_input?: PreToolUseInput['tool_input'] }): PreToolUseInput {
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
  // Mark as FCA project
  writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-pkg' }));
  writeFileSync(join(tmpDir, 'INTENT.md'), '## Purpose\nTest project\n## Boundaries\nAll\n');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// mergeResults — pure function tests
// ---------------------------------------------------------------------------

describe('mergeResults', () => {
  it('all continue=true → combined true', () => {
    const results: HookOutput[] = [
      { continue: true },
      { continue: true },
      { continue: true },
    ];
    const out = mergeResults(results);
    expect(out.continue).toBe(true);
  });

  it('one continue=false → combined false', () => {
    const results: HookOutput[] = [
      { continue: true },
      { continue: false, hookSpecificOutput: { additionalContext: 'blocked' } },
      { continue: true },
    ];
    const out = mergeResults(results);
    expect(out.continue).toBe(false);
  });

  it('additionalContext from multiple results concatenated with \\n\\n', () => {
    const results: HookOutput[] = [
      { continue: true, hookSpecificOutput: { additionalContext: 'ctx-A' } },
      { continue: true, hookSpecificOutput: { additionalContext: 'ctx-B' } },
    ];
    const out = mergeResults(results);
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.additionalContext).toBe('ctx-A\n\nctx-B');
  });

  it('no additionalContext → no hookSpecificOutput', () => {
    const results: HookOutput[] = [
      { continue: true },
      { continue: true },
    ];
    const out = mergeResults(results);
    expect(out.hookSpecificOutput).toBeUndefined();
  });

  it('block with hookSpecificOutput uses blocker output', () => {
    const blocker: HookOutput = {
      continue: false,
      hookSpecificOutput: { additionalContext: 'violation message' },
    };
    const out = mergeResults([{ continue: true }, blocker]);
    expect(out.continue).toBe(false);
    expect(out.hookSpecificOutput?.additionalContext).toBe('violation message');
  });

  it('empty results → continue=true', () => {
    const out = mergeResults([]);
    expect(out.continue).toBe(true);
  });
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

  it('Write INTENT.md inside organ directory → block (continue=false)', async () => {
    // 'utils' is a known organ directory
    const organDir = join(tmpDir, 'src', 'utils');
    mkdirSync(organDir, { recursive: true });
    const filePath = join(organDir, 'INTENT.md');

    const input = makeInput({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: '# Utils\n' },
    });

    const result = await handlePreToolUse(input);
    expect(result.continue).toBe(false);
  });

  it('Edit INTENT.md with >20 line new_string → continue=true with warning', async () => {
    const intentPath = join(tmpDir, 'src', 'auth', 'INTENT.md');
    mkdirSync(join(tmpDir, 'src', 'auth'), { recursive: true });
    writeFileSync(intentPath, '# Auth\n## Purpose\nAuth module\n## Boundaries\nAll\n');

    const newString = Array.from({ length: 25 }, (_, i) => `Line ${i}`).join('\n');

    const input = makeInput({
      tool_name: 'Edit',
      tool_input: { file_path: intentPath, new_string: newString },
    });

    const result = await handlePreToolUse(input);
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('25 new lines');
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
    // Append-only detection should block
    expect(result.continue).toBe(false);
  });
});
