import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readTurnContext, writeTurnContext } from '../cache-manager/cache-manager.js';
import { runCacheUpdater } from '../cache-updater/cache-updater.js';

let vaultDir: string;
let cacheTestDir: string;

beforeEach(() => {
  vaultDir = join(
    tmpdir(),
    `maencof-cu-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  cacheTestDir = join(
    tmpdir(),
    `maencof-cu-cache-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(join(vaultDir, '.maencof'), { recursive: true });
  mkdirSync(join(vaultDir, '.maencof-meta'), { recursive: true });
  vi.stubEnv('CLAUDE_CONFIG_DIR', cacheTestDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function writeIndex(nodes: Array<{ layer?: number }>): void {
  writeFileSync(
    join(vaultDir, '.maencof', 'index.json'),
    JSON.stringify({ nodes }),
    'utf-8',
  );
}

function writeStaleNodes(paths: string[]): void {
  writeFileSync(
    join(vaultDir, '.maencof', 'stale-nodes.json'),
    JSON.stringify({ paths, updatedAt: new Date().toISOString() }),
    'utf-8',
  );
}

describe('runCacheUpdater', () => {
  it('skips non-vault directories', () => {
    const result = runCacheUpdater({
      cwd: '/nonexistent',
      tool_name: 'create',
    });
    expect(result.continue).toBe(true);
  });

  it('skips non-mutation tool names', () => {
    const result = runCacheUpdater({ cwd: vaultDir, tool_name: 'kg_search' });
    expect(result.continue).toBe(true);
    // No turn-context should be created for non-mutation tools
    expect(readTurnContext(vaultDir)).toBeNull();
  });

  it('rebuilds turn-context cache after mutation tool call', () => {
    writeIndex([{ layer: 1 }, { layer: 3 }]);
    runCacheUpdater({ cwd: vaultDir, tool_name: 'create' });
    const cached = readTurnContext(vaultDir);
    expect(cached).not.toBeNull();
    expect(cached).toContain('<kg-core');
    expect(cached).toContain('nodes="2"');
  });

  it('updated turn context reflects new stale-nodes count', () => {
    writeIndex(Array.from({ length: 10 }, () => ({ layer: 1 })));
    writeStaleNodes(['/a.md', '/b.md', '/c.md']); // 3/10 = 30%
    runCacheUpdater({ cwd: vaultDir, tool_name: 'update' });
    const cached = readTurnContext(vaultDir);
    expect(cached).toContain('stale="3"');
    expect(cached).toContain('<kg-stale-advisory');
  });
});
