import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readTurnContext } from '../../core/cacheManager/index.js';
import { injectContext } from '../userPromptSubmit/helpers/contextInjector/contextInjector.js';

let vaultDir: string;
let cacheTestDir: string;

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-ci-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  cacheTestDir = join(
    tmpdir(),
    `maencof-ci-cache-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  // Create vault structure
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  vi.stubEnv('CLAUDE_CONFIG_DIR', cacheTestDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function writeIndex(
  nodes: Array<{ layer?: number; domain?: string; subLayer?: string }>,
): void {
  // 신규 샤드 layout 으로 fixture 작성. hook readers 는 nodes.json 을 우선 본다.
  writeFileSync(
    join(vaultDir, '.maencof', 'nodes.json'),
    JSON.stringify(nodes),
    'utf-8',
  );
  writeFileSync(
    join(vaultDir, '.maencof', 'graph-meta.json'),
    JSON.stringify({
      schemaVersion: 2,
      builtAt: 'x',
      nodeCount: nodes.length,
      edgeCount: 0,
    }),
    'utf-8',
  );
}

describe('injectContext', () => {
  it('returns { continue: true } with no additionalContext for non-vault', () => {
    const result = injectContext({
      cwd: '/nonexistent/path',
      session_id: 's1',
    });
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  it('first prompt injects session context + turn context', () => {
    writeIndex([
      { layer: 1, domain: 'tech' },
      { layer: 3, domain: 'tech' },
      { layer: 4, domain: 'work' },
    ]);
    const result = injectContext({ cwd: vaultDir, session_id: 'first-test' });
    expect(result.continue).toBe(true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    // Session context markers
    expect(ctx).toContain('[maencof] Knowledge Graph Summary');
    expect(ctx).toContain('[maencof] Session Directives');
    // Turn context markers
    expect(ctx).toContain('<kg-core');
    expect(ctx).toContain('<kg-directive>');
  });

  it('second prompt injects turn context only (no session context)', () => {
    writeIndex([{ layer: 1 }]);
    // First prompt
    injectContext({ cwd: vaultDir, session_id: 'repeat-test' });
    // Second prompt
    const result = injectContext({ cwd: vaultDir, session_id: 'repeat-test' });
    expect(result.continue).toBe(true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('<kg-core');
    expect(ctx).not.toContain('[maencof] Knowledge Graph Summary');
  });

  it('turn context contains <kg-core> and <kg-directive> tags', () => {
    writeIndex([{ layer: 1 }, { layer: 2 }]);
    const result = injectContext({ cwd: vaultDir, session_id: 'tags-test' });
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('<kg-core');
    expect(ctx).toContain('nodes="2"');
    expect(ctx).toContain('<kg-directive>');
  });

  it('session context includes KG summary text', () => {
    writeIndex([
      { layer: 1, domain: 'security' },
      { layer: 3, domain: 'security' },
      { layer: 4, domain: 'project' },
    ]);
    const result = injectContext({ cwd: vaultDir, session_id: 'summary-test' });
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('3 nodes across 5 layers');
    expect(ctx).toContain('security');
  });

  it('session context surfaces L5 buffer inbox count only when non-zero', () => {
    writeIndex([
      { layer: 5, subLayer: 'buffer' },
      { layer: 5, subLayer: 'buffer' },
      { layer: 5, subLayer: 'boundary' },
      { layer: 2 },
    ]);
    const result = injectContext({ cwd: vaultDir, session_id: 'buffer-test' });
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('L5 buffer inbox: 2 unclassified');
    expect(ctx).toContain('/maencof:organize');
  });

  it('session context omits buffer inbox line when buffer is empty', () => {
    writeIndex([{ layer: 2 }, { layer: 5, subLayer: 'boundary' }]);
    const result = injectContext({ cwd: vaultDir, session_id: 'no-buf-test' });
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain('[maencof] Knowledge Graph Summary');
    expect(ctx).not.toContain('L5 buffer inbox');
  });

  it('builds and caches turn context on first access', () => {
    writeIndex([{ layer: 1 }]);
    // No turn-context cache exists yet
    expect(readTurnContext(vaultDir)).toBeNull();
    // First prompt builds and caches it
    injectContext({ cwd: vaultDir, session_id: 'cache-test' });
    expect(readTurnContext(vaultDir)).not.toBeNull();
    expect(readTurnContext(vaultDir)).toContain('<kg-core');
  });
});
