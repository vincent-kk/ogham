import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  incrementTurn,
  removeFractalMap,
} from '../../../core/infra/cacheManager/cacheManager.js';
import {
  processVisit,
  visitKey,
} from '../../../hooks/preToolUse/helpers/intentInjector/index.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;
let sessionCounter = 0;

function makeInput(
  overrides: Partial<PreToolUseInput> & {
    tool_input?: PreToolUseInput['tool_input'];
  },
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

/** Root package.json + INTENT.md so the tmp project is FCA with an owner. */
function makeRootProject(): void {
  writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 't' }));
  writeFileSync(
    join(tmpDir, 'INTENT.md'),
    '## Purpose\nRoot module\n## Boundaries\nNever do: direct DB access\n',
  );
}

/** Advance the session turn counter by n (simulates n UserPromptSubmit). */
function advanceTurns(sessionId: string, n: number): void {
  for (let i = 0; i < n; i++) incrementTurn(tmpDir, sessionId);
}

const ctxOf = (r: { hookSpecificOutput?: { additionalContext?: string } }) =>
  r.hookSpecificOutput?.additionalContext ?? '';
const denyOf = (r: {
  hookSpecificOutput?: { permissionDecision?: string };
}): boolean => r.hookSpecificOutput?.permissionDecision === 'deny';
const reasonOf = (r: {
  hookSpecificOutput?: { permissionDecisionReason?: string };
}) => r.hookSpecificOutput?.permissionDecisionReason ?? '';

beforeEach(() => {
  tmpDir = join(
    tmpdir(),
    `filid-injector-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tmpDir, { recursive: true });
  process.env.CLAUDE_CONFIG_DIR = tmpDir;
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// processVisit — delivery-model contract (3-state × tool matrix)
// ---------------------------------------------------------------------------

describe('processVisit (Read path)', () => {
  it('non-FCA project (no boundary) → clean skip', () => {
    const filePath = join(tmpDir, 'src', 'index.ts');
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(filePath, '');

    const result = processVisit(
      makeInput({ tool_input: { file_path: filePath } }),
    );

    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('first Read in a module → guide + ctx (inline INTENT body) + map', () => {
    makeRootProject();
    const filePath = join(tmpDir, 'index.ts');
    writeFileSync(filePath, '');

    const result = processVisit(
      makeInput({ tool_input: { file_path: filePath } }),
    );

    const ctx = ctxOf(result);
    expect(ctx).toContain('[filid:guide]');
    expect(ctx).toContain('[filid:ctx]');
    expect(ctx).toContain('Root module');
    expect(ctx).toContain('[filid:map]');
    expect(denyOf(result)).toBe(false);
  });

  it('ancestor chain with INTENT.md → chain: line present', () => {
    makeRootProject();
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'INTENT.md'), '## Purpose\nSrc\n');
    writeFileSync(
      join(tmpDir, 'src', 'feature', 'INTENT.md'),
      '## Purpose\nFeature\n',
    );
    const filePath = join(tmpDir, 'src', 'feature', 'index.ts');
    writeFileSync(filePath, '');

    const result = processVisit(
      makeInput({ tool_input: { file_path: filePath } }),
    );

    expect(ctxOf(result)).toContain('chain:');
  });

  it('same dir re-read in the same turn → fully silent (no map re-emission)', () => {
    makeRootProject();
    const filePath = join(tmpDir, 'index.ts');
    writeFileSync(filePath, '');
    const sessionId = `session-silent-${Date.now()}`;
    const input = makeInput({
      session_id: sessionId,
      tool_input: { file_path: filePath },
    });

    const first = processVisit(input);
    expect(ctxOf(first)).toContain('[filid:ctx]');

    const second = processVisit(input);
    expect(second.hookSpecificOutput).toBeUndefined();
  });

  it('DETAIL.md present at owner → detail: hint line', () => {
    makeRootProject();
    writeFileSync(join(tmpDir, 'DETAIL.md'), '# Details\n');
    const filePath = join(tmpDir, 'index.ts');
    writeFileSync(filePath, '');

    const result = processVisit(
      makeInput({ tool_input: { file_path: filePath } }),
    );

    expect(ctxOf(result)).toContain('detail:');
  });

  it('organ dir → inlines owning fractal INTENT.md; sibling organ later stays ctx-free but map grows once', () => {
    makeRootProject();
    mkdirSync(join(tmpDir, 'src', 'feature', 'utils'), { recursive: true });
    mkdirSync(join(tmpDir, 'src', 'feature', 'types'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'src', 'feature', 'INTENT.md'),
      '## Purpose\nFeature module\n## Boundaries\nNever do: direct DB access\n',
    );
    writeFileSync(join(tmpDir, 'src', 'feature', 'utils', 'helper.ts'), '');
    writeFileSync(join(tmpDir, 'src', 'feature', 'types', 'index.ts'), '');

    const sessionId = `session-organ-${Date.now()}`;
    const first = processVisit(
      makeInput({
        session_id: sessionId,
        tool_input: {
          file_path: join(tmpDir, 'src', 'feature', 'utils', 'helper.ts'),
        },
      }),
    );
    const ctx1 = ctxOf(first);
    expect(ctx1).toContain('Feature module');
    expect(ctx1).toContain('intent: src/feature/INTENT.md');
    expect(ctx1).not.toMatch(/chain:.*src\/feature\/INTENT\.md/);

    const second = processVisit(
      makeInput({
        session_id: sessionId,
        tool_input: {
          file_path: join(tmpDir, 'src', 'feature', 'types', 'index.ts'),
        },
      }),
    );
    const ctx2 = ctxOf(second);
    // owner already delivered → no ctx re-inline, but the visit set grew → map
    expect(ctx2).not.toContain('[filid:ctx]');
    expect(ctx2).toContain('[filid:map]');
    expect(ctx2).toContain('types');
  });

  it('cross-turn within TTL → fresh: no ctx (map only, visit set reset)', () => {
    makeRootProject();
    const filePath = join(tmpDir, 'index.ts');
    writeFileSync(filePath, '');
    const sessionId = `session-fresh-${Date.now()}`;
    const input = makeInput({
      session_id: sessionId,
      tool_input: { file_path: filePath },
    });

    const turn1 = processVisit(input);
    expect(ctxOf(turn1)).toContain('[filid:ctx]');

    // turn boundary: fmap reset + one turn elapsed (well within TTL 5)
    removeFractalMap(tmpDir, sessionId);
    advanceTurns(sessionId, 1);

    const turn2 = processVisit(input);
    const ctx = ctxOf(turn2);
    expect(ctx).not.toContain('[filid:ctx]');
    expect(ctx).toContain('[filid:map]');
  });

  it('TTL expiry → stale: ctx re-delivered without guide', () => {
    makeRootProject();
    const filePath = join(tmpDir, 'index.ts');
    writeFileSync(filePath, '');
    const sessionId = `session-stale-${Date.now()}`;
    const input = makeInput({
      session_id: sessionId,
      tool_input: { file_path: filePath },
    });

    const turn1 = processVisit(input);
    expect(ctxOf(turn1)).toContain('[filid:guide]');

    removeFractalMap(tmpDir, sessionId);
    advanceTurns(sessionId, 5); // default ctxTtlTurns = 5 → now stale

    const later = processVisit(input);
    const ctx = ctxOf(later);
    expect(ctx).toContain('[filid:ctx]');
    expect(ctx).toContain('Root module');
    expect(ctx).not.toContain('[filid:guide]');
  });

  it('monorepo: same relDir under two packages → both delivered independently', () => {
    for (const pkg of ['alpha', 'beta']) {
      mkdirSync(join(tmpDir, 'packages', pkg, 'src'), { recursive: true });
      writeFileSync(
        join(tmpDir, 'packages', pkg, 'package.json'),
        JSON.stringify({ name: pkg }),
      );
      writeFileSync(
        join(tmpDir, 'packages', pkg, 'src', 'INTENT.md'),
        `## Purpose\n${pkg} source\n`,
      );
      writeFileSync(join(tmpDir, 'packages', pkg, 'src', 'index.ts'), '');
    }
    writeFileSync(join(tmpDir, 'INTENT.md'), '## Purpose\nRepo root\n');

    const sessionId = `session-monorepo-${Date.now()}`;
    const readPkg = (pkg: string) =>
      processVisit(
        makeInput({
          session_id: sessionId,
          tool_input: {
            file_path: join(tmpDir, 'packages', pkg, 'src', 'index.ts'),
          },
        }),
      );

    expect(ctxOf(readPkg('alpha'))).toContain('alpha source');
    expect(ctxOf(readPkg('beta'))).toContain('beta source');
  });
});

describe('processVisit (mutation path — deny gate)', () => {
  it('Write to undelivered module → deny; reason carries guide + inline INTENT body', () => {
    makeRootProject();
    const filePath = join(tmpDir, 'newfile.ts');

    const result = processVisit(
      makeInput({
        tool_name: 'Write',
        tool_input: { file_path: filePath, content: 'export {};\n' },
      }),
    );

    expect(result.continue).toBe(true);
    expect(denyOf(result)).toBe(true);
    const reason = reasonOf(result);
    expect(reason).toContain('[filid:gate]');
    expect(reason).toContain('[filid:guide]');
    expect(reason).toContain('[filid:ctx]');
    expect(reason).toContain('Root module');
  });

  it('retry after gate deny → passes silently (deny delivered the rules)', () => {
    makeRootProject();
    const filePath = join(tmpDir, 'newfile.ts');
    const sessionId = `session-retry-${Date.now()}`;
    const input = makeInput({
      session_id: sessionId,
      tool_name: 'Write',
      tool_input: { file_path: filePath, content: 'export {};\n' },
    });

    expect(denyOf(processVisit(input))).toBe(true);
    const retry = processVisit(input);
    expect(denyOf(retry)).toBe(false);
    expect(ctxOf(retry)).not.toContain('[filid:ctx]');
  });

  it('mutation on a delivered-fresh module → silent pass; stale → soft ctx, never deny', () => {
    makeRootProject();
    const readPath = join(tmpDir, 'index.ts');
    writeFileSync(readPath, '');
    const sessionId = `session-mut-${Date.now()}`;

    // deliver via Read
    processVisit(
      makeInput({ session_id: sessionId, tool_input: { file_path: readPath } }),
    );

    // fresh mutation (next turn, within TTL)
    removeFractalMap(tmpDir, sessionId);
    advanceTurns(sessionId, 1);
    const freshEdit = processVisit(
      makeInput({
        session_id: sessionId,
        tool_name: 'Edit',
        tool_input: { file_path: readPath, old_string: 'a', new_string: 'b' },
      }),
    );
    expect(denyOf(freshEdit)).toBe(false);
    expect(ctxOf(freshEdit)).not.toContain('[filid:ctx]');

    // stale mutation (TTL elapsed) → soft re-delivery, no deny
    removeFractalMap(tmpDir, sessionId);
    advanceTurns(sessionId, 5);
    const staleEdit = processVisit(
      makeInput({
        session_id: sessionId,
        tool_name: 'Edit',
        tool_input: { file_path: readPath, old_string: 'a', new_string: 'b' },
      }),
    );
    expect(denyOf(staleEdit)).toBe(false);
    expect(ctxOf(staleEdit)).toContain('[filid:ctx]');
  });

  it('INTENT.md self-authoring → exempt + marks delivered for that module', () => {
    makeRootProject();
    mkdirSync(join(tmpDir, 'src', 'mod'), { recursive: true });
    const sessionId = `session-author-${Date.now()}`;

    const writeIntent = processVisit(
      makeInput({
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: {
          file_path: join(tmpDir, 'src', 'mod', 'INTENT.md'),
          content: '## Purpose\nMod\n',
        },
      }),
    );
    expect(denyOf(writeIntent)).toBe(false);

    const writeCode = processVisit(
      makeInput({
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: {
          file_path: join(tmpDir, 'src', 'mod', 'index.ts'),
          content: 'export {};\n',
        },
      }),
    );
    expect(denyOf(writeCode)).toBe(false);
    expect(ctxOf(writeCode)).not.toContain('[filid:ctx]');
  });

  it('module without any owner INTENT.md → no deny (nothing to deliver)', () => {
    // FCA project (marker dir) but no INTENT.md anywhere in the chain
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 't' }));
    mkdirSync(join(tmpDir, '.filid'), { recursive: true });
    mkdirSync(join(tmpDir, 'src'), { recursive: true });

    const result = processVisit(
      makeInput({
        tool_name: 'Write',
        tool_input: {
          file_path: join(tmpDir, 'src', 'a.ts'),
          content: 'export {};\n',
        },
      }),
    );
    expect(denyOf(result)).toBe(false);
  });

  it('spike mode → gate suspended (undelivered mutation passes)', () => {
    makeRootProject();
    const result = processVisit(
      makeInput({
        tool_name: 'Write',
        tool_input: {
          file_path: join(tmpDir, 'spikefile.ts'),
          content: 'export {};\n',
        },
      }),
      true,
    );
    expect(denyOf(result)).toBe(false);
  });

  it('unread-intent is gone: Write-then-Read never emits the legacy warning', () => {
    makeRootProject();
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(join(tmpDir, 'index.ts'), '');
    const sessionId = `session-nounread-${Date.now()}`;

    const write = processVisit(
      makeInput({
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: {
          file_path: join(tmpDir, 'src', 'feature', 'x.ts'),
          content: 'export {};\n',
        },
      }),
    );
    // gate delivers rules by deny — retry then passes
    expect(denyOf(write)).toBe(true);
    processVisit(
      makeInput({
        session_id: sessionId,
        tool_name: 'Write',
        tool_input: {
          file_path: join(tmpDir, 'src', 'feature', 'x.ts'),
          content: 'export {};\n',
        },
      }),
    );

    const read = processVisit(
      makeInput({
        session_id: sessionId,
        tool_input: { file_path: join(tmpDir, 'index.ts') },
      }),
    );
    expect(ctxOf(read)).not.toContain('unread-intent');
  });
});

describe('visitKey', () => {
  it('composite key embeds boundary to disambiguate monorepo relDirs', () => {
    expect(visitKey('/repo/pkg-a', 'src')).not.toEqual(
      visitKey('/repo/pkg-b', 'src'),
    );
  });
});
