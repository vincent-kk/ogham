import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readTurnContext } from '../cache-manager.js';
import { injectContext } from '../context-injector.js';

let vaultDir: string;
let cacheTestDir: string;

beforeEach(() => {
  vaultDir = join(tmpdir(), `maencof-ci-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  cacheTestDir = join(tmpdir(), `maencof-ci-cache-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  // Create vault structure
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  vi.stubEnv('CLAUDE_CONFIG_DIR', cacheTestDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function writeIndex(nodes: Array<{ layer?: number; domain?: string }>): void {
  writeFileSync(
    join(vaultDir, '.maencof', 'index.json'),
    JSON.stringify({ nodes }),
    'utf-8',
  );
}

describe('injectContext', () => {
  it('returns { continue: true } with no additionalContext for non-vault', () => {
    const result = injectContext({ cwd: '/nonexistent/path', session_id: 's1' });
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
