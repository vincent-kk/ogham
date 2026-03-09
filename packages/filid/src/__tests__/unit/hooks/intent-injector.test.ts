import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { compressPaths, injectIntent } from '../../../hooks/intent-injector.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;
let sessionCounter = 0;

function makeInput(
  overrides: Partial<PreToolUseInput> & { tool_input?: PreToolUseInput['tool_input'] },
): PreToolUseInput {
  return {
    cwd: tmpDir,
    // unique session per test to avoid fmap state bleed
    session_id: `session-${++sessionCounter}`,
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
    tool_input: {},
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = join(tmpdir(), `filid-injector-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// compressPaths — pure function tests
// ---------------------------------------------------------------------------

describe('compressPaths', () => {
  it('empty array → empty string', () => {
    expect(compressPaths([])).toBe('');
  });

  it('single path → returns path unchanged', () => {
    expect(compressPaths(['src/auth'])).toBe('src/auth');
  });

  it('two paths with common prefix → brace notation', () => {
    const result = compressPaths(['src/payment/checkout', 'src/payment/refund']);
    // Should contain the common prefix and both suffixes grouped
    expect(result).toContain('payment');
    expect(result).toContain('checkout');
    expect(result).toContain('refund');
    // Brace notation expected
    expect(result).toMatch(/\{.*checkout.*refund.*\}|checkout.*refund/);
  });

  it('paths with no common prefix → comma-joined', () => {
    const result = compressPaths(['src/auth', 'src/payment']);
    expect(result).toContain('auth');
    expect(result).toContain('payment');
  });

  it('currentDir marked with * suffix', () => {
    const result = compressPaths(['src/auth', 'src/payment'], 'src/auth');
    // compressPaths marks currentDir with /* suffix; brace notation groups under common prefix
    expect(result).toContain('auth/*');
  });

  it('single path matching currentDir → adds * suffix', () => {
    expect(compressPaths(['src/auth'], 'src/auth')).toBe('src/auth/*');
  });
});

// ---------------------------------------------------------------------------
// injectIntent — filesystem-based tests
// ---------------------------------------------------------------------------

describe('injectIntent', () => {
  it('non-FCA project (no .filid/, INTENT.md) → skip', () => {
    // tmpDir has no FCA markers and no package.json → buildChain returns null
    const filePath = join(tmpDir, 'src', 'index.ts');
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(filePath, '');

    const input = makeInput({ tool_input: { file_path: filePath } });
    const result = injectIntent(input);

    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('INTENT.md exists at file directory → full context injection', () => {
    // Set up FCA project
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(
      join(tmpDir, 'INTENT.md'),
      '## Purpose\nRoot module\n## Boundaries\nAll\n',
    );

    const filePath = join(tmpDir, 'index.ts');
    writeFileSync(filePath, '');

    const input = makeInput({ cwd: tmpDir, tool_input: { file_path: filePath } });
    const result = injectIntent(input);

    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.additionalContext).toContain('[filid:ctx]');
    expect(result.hookSpecificOutput?.additionalContext).toContain('INTENT.md');
    // INTENT.md content should be embedded
    expect(result.hookSpecificOutput?.additionalContext).toContain('Root module');
  });

  it('ancestor chain: ancestor directories with INTENT.md → chain: line in output', () => {
    // Structure: tmpDir/src/feature/file.ts
    // tmpDir has INTENT.md (root), tmpDir/src has INTENT.md (ancestor)
    // tmpDir/src/feature has INTENT.md (leaf)
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(
      join(tmpDir, 'INTENT.md'),
      '## Purpose\nRoot\n## Boundaries\nAll\n',
    );
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'src', 'INTENT.md'),
      '## Purpose\nSrc\n## Boundaries\nAll\n',
    );
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'src', 'feature', 'INTENT.md'),
      '## Purpose\nFeature\n## Boundaries\nAll\n',
    );

    const filePath = join(tmpDir, 'src', 'feature', 'index.ts');
    writeFileSync(filePath, '');

    const input = makeInput({ cwd: tmpDir, tool_input: { file_path: filePath } });
    const result = injectIntent(input);

    expect(result.continue).toBe(true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    // chain: line should reference ancestor INTENT.md files
    expect(ctx).toContain('chain:');
  });

  it('dedup revisit: second call for same directory+session → only [filid:map] (no [filid:ctx])', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(
      join(tmpDir, 'INTENT.md'),
      '## Purpose\nRoot\n## Boundaries\nAll\n',
    );

    const filePath = join(tmpDir, 'index.ts');
    writeFileSync(filePath, '');

    const sessionId = `session-dedup-${Date.now()}`;
    const input = makeInput({
      cwd: tmpDir,
      session_id: sessionId,
      tool_input: { file_path: filePath },
    });

    // First visit
    const first = injectIntent(input);
    expect(first.hookSpecificOutput?.additionalContext).toContain('[filid:ctx]');

    // Second visit (same session, same directory)
    const second = injectIntent({ ...input, session_id: sessionId });
    const ctx = second.hookSpecificOutput?.additionalContext ?? '';
    // Should have map block but NOT ctx block
    expect(ctx).toContain('[filid:map]');
    expect(ctx).not.toContain('[filid:ctx]');
  });

  it('DETAIL.md hint: directory has DETAIL.md → detail: line in output', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(
      join(tmpDir, 'INTENT.md'),
      '## Purpose\nRoot\n## Boundaries\nAll\n',
    );
    writeFileSync(join(tmpDir, 'DETAIL.md'), '# Details\nSome details\n');

    const filePath = join(tmpDir, 'index.ts');
    writeFileSync(filePath, '');

    const input = makeInput({ cwd: tmpDir, tool_input: { file_path: filePath } });
    const result = injectIntent(input);

    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('detail:');
    expect(ctx).toContain('DETAIL.md');
  });

  it('organ directory → inlines owning fractal INTENT.md, not organ path', () => {
    // Structure: root/src/feature/utils/helper.ts
    // root: package.json + INTENT.md
    // src/feature: INTENT.md (owning fractal)
    // src/feature/utils: organ (no INTENT.md)
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(join(tmpDir, 'INTENT.md'), '## Purpose\nRoot\n');
    mkdirSync(join(tmpDir, 'src', 'feature', 'utils'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'src', 'feature', 'INTENT.md'),
      '## Purpose\nFeature module\n## Boundaries\nNever do: direct DB access\n',
    );
    writeFileSync(join(tmpDir, 'src', 'feature', 'utils', 'helper.ts'), '');

    const input = makeInput({
      cwd: tmpDir,
      tool_input: { file_path: join(tmpDir, 'src', 'feature', 'utils', 'helper.ts') },
    });
    const result = injectIntent(input);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';

    // Should inline feature's INTENT.md content
    expect(ctx).toContain('Feature module');
    expect(ctx).toContain('direct DB access');
    // intent: should point to feature's INTENT.md, not utils/INTENT.md
    expect(ctx).toContain('intent: src/feature/INTENT.md');
    // chain should NOT include feature (already inlined), but should include root
    expect(ctx).not.toMatch(/chain:.*src\/feature\/INTENT\.md/);
  });

  it('sibling organ → does NOT re-inline owning fractal INTENT.md', () => {
    // Structure: root/src/feature/{utils,types}
    // feature has INTENT.md, utils and types are organs
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(join(tmpDir, 'INTENT.md'), '## Purpose\nRoot\n');
    mkdirSync(join(tmpDir, 'src', 'feature', 'utils'), { recursive: true });
    mkdirSync(join(tmpDir, 'src', 'feature', 'types'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'src', 'feature', 'INTENT.md'),
      '## Purpose\nFeature module\n',
    );
    writeFileSync(join(tmpDir, 'src', 'feature', 'utils', 'helper.ts'), '');
    writeFileSync(join(tmpDir, 'src', 'feature', 'types', 'index.ts'), '');

    const sessionId = `session-sibling-${Date.now()}`;

    // First organ visit — should inline feature's INTENT.md
    const input1 = makeInput({
      cwd: tmpDir,
      session_id: sessionId,
      tool_input: { file_path: join(tmpDir, 'src', 'feature', 'utils', 'helper.ts') },
    });
    const result1 = injectIntent(input1);
    const ctx1 = result1.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx1).toContain('Feature module');
    expect(ctx1).toContain('[filid:ctx]');

    // Second organ visit (sibling) — should NOT re-inline
    const input2 = makeInput({
      cwd: tmpDir,
      session_id: sessionId,
      tool_input: { file_path: join(tmpDir, 'src', 'feature', 'types', 'index.ts') },
    });
    const result2 = injectIntent(input2);
    const ctx2 = result2.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx2).not.toContain('[filid:ctx]');
    expect(ctx2).not.toContain('Feature module');
    expect(ctx2).toContain('[filid:map]');
  });

  it('fractal map accumulation: multiple calls → fmap.reads grows', () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    writeFileSync(
      join(tmpDir, 'INTENT.md'),
      '## Purpose\nRoot\n## Boundaries\nAll\n',
    );

    // Two distinct subdirectories
    mkdirSync(join(tmpDir, 'auth'), { recursive: true });
    writeFileSync(join(tmpDir, 'auth', 'login.ts'), '');
    mkdirSync(join(tmpDir, 'payment'), { recursive: true });
    writeFileSync(join(tmpDir, 'payment', 'checkout.ts'), '');

    const sessionId = `session-accum-${Date.now()}`;

    const inputA = makeInput({
      cwd: tmpDir,
      session_id: sessionId,
      tool_input: { file_path: join(tmpDir, 'auth', 'login.ts') },
    });
    const inputB = makeInput({
      cwd: tmpDir,
      session_id: sessionId,
      tool_input: { file_path: join(tmpDir, 'payment', 'checkout.ts') },
    });

    injectIntent(inputA);
    const result = injectIntent(inputB);

    // After two calls the map should reference both directories
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('[filid:map]');
    // Both dirs should appear in the compressed map
    expect(ctx).toContain('auth');
    expect(ctx).toContain('payment');
  });
});
