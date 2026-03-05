import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cwdHash,
  getCacheDir,
  hasPromptContext,
  isFirstInSession,
  markSessionInjected,
  readPinnedNodes,
  readPromptContext,
  readTurnContext,
  removeSessionFiles,
  sessionIdHash,
  writePinnedNodes,
  writePromptContext,
  writeTurnContext,
} from '../cache-manager.js';
import type { PinnedNode } from '../cache-manager.js';

let testDir: string;

beforeEach(() => {
  testDir = join(
    tmpdir(),
    `maencof-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(testDir, { recursive: true });
  vi.stubEnv('CLAUDE_CONFIG_DIR', testDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('cwdHash', () => {
  it('returns consistent 12-char hex string', () => {
    const hash = cwdHash('/test/path');
    expect(hash).toHaveLength(12);
    expect(hash).toMatch(/^[0-9a-f]{12}$/);
    expect(cwdHash('/test/path')).toBe(hash);
  });
});

describe('getCacheDir', () => {
  it('uses CLAUDE_CONFIG_DIR env when set', () => {
    const dir = getCacheDir('/my/vault');
    expect(dir).toContain(testDir);
    expect(dir).toContain('plugins/maencof/');
  });

  it('falls back to ~/.claude when env not set', () => {
    vi.stubEnv('CLAUDE_CONFIG_DIR', '');
    delete process.env.CLAUDE_CONFIG_DIR;
    const dir = getCacheDir('/my/vault');
    expect(dir).toContain('plugins/maencof/');
  });
});

describe('session gating', () => {
  it('isFirstInSession returns true when no marker exists', () => {
    expect(isFirstInSession('sess-1', '/fake/vault')).toBe(true);
  });

  it('isFirstInSession returns false after markSessionInjected', () => {
    const cwd = '/test/vault-1';
    expect(isFirstInSession('sess-2', cwd)).toBe(true);
    markSessionInjected('sess-2', cwd);
    expect(isFirstInSession('sess-2', cwd)).toBe(false);
  });
});

describe('prompt context', () => {
  it('writePromptContext + readPromptContext round-trip', () => {
    const cwd = '/test/vault-pc';
    writePromptContext(cwd, 'test context data', 'sess-pc');
    const result = readPromptContext(cwd, 'sess-pc');
    expect(result).toBe('test context data');
  });

  it('hasPromptContext returns false before write, true after', () => {
    const cwd = '/test/vault-hpc';
    expect(hasPromptContext('sess-hpc', cwd)).toBe(false);
    writePromptContext(cwd, 'data', 'sess-hpc');
    expect(hasPromptContext('sess-hpc', cwd)).toBe(true);
  });
});

describe('turn context', () => {
  it('writeTurnContext + readTurnContext round-trip', () => {
    const cwd = '/test/vault-tc';
    writeTurnContext(cwd, '<kg-core nodes="10" />');
    const result = readTurnContext(cwd);
    expect(result).toBe('<kg-core nodes="10" />');
  });

  it('readTurnContext returns null when file missing', () => {
    expect(readTurnContext('/nonexistent/vault')).toBeNull();
  });
});

describe('pinned nodes', () => {
  it('readPinnedNodes returns empty array when file missing', () => {
    expect(readPinnedNodes('/nonexistent/vault')).toEqual([]);
  });

  it('writePinnedNodes + readPinnedNodes round-trip', () => {
    const cwd = '/test/vault-pin';
    const nodes: PinnedNode[] = [
      { id: 'n1', title: 'Node 1', layer: 1, pinnedAt: '2026-01-01T00:00:00Z' },
      { id: 'n2', title: 'Node 2', layer: 3, pinnedAt: '2026-01-02T00:00:00Z' },
    ];
    writePinnedNodes(cwd, nodes);
    const result = readPinnedNodes(cwd);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('n1');
    expect(result[1].id).toBe('n2');
  });
});

describe('removeSessionFiles', () => {
  it('cleans session files but not turn-context/pinned-nodes', () => {
    const cwd = '/test/vault-rm';
    // Create session files
    markSessionInjected('sess-rm', cwd);
    writePromptContext(cwd, 'ctx', 'sess-rm');
    // Create vault-scoped files
    writeTurnContext(cwd, 'turn');
    writePinnedNodes(cwd, [
      { id: 'x', title: 'X', layer: 1, pinnedAt: '2026-01-01T00:00:00Z' },
    ]);

    // Remove session files
    removeSessionFiles('sess-rm', cwd);

    // Session files gone
    expect(isFirstInSession('sess-rm', cwd)).toBe(true);
    expect(readPromptContext(cwd, 'sess-rm')).toBeNull();

    // Vault-scoped files remain
    expect(readTurnContext(cwd)).toBe('turn');
    expect(readPinnedNodes(cwd)).toHaveLength(1);
  });
});

describe('pruneOldSessions', () => {
  it('removes markers older than 24h', () => {
    const cwd = '/test/vault-prune';
    // Create 12 session markers to trigger pruning (threshold is 10)
    for (let i = 0; i < 12; i++) {
      markSessionInjected(`old-sess-${i}`, cwd);
    }

    const cacheDir = getCacheDir(cwd);
    // Manually backdate first 5 markers to >24h ago
    const files = require('node:fs').readdirSync(cacheDir) as string[];
    const sessionFiles = files.filter((f: string) =>
      f.startsWith('session-context-'),
    );
    const oldTime = Date.now() - 25 * 60 * 60 * 1000; // 25h ago

    for (let i = 0; i < Math.min(5, sessionFiles.length); i++) {
      const fp = join(cacheDir, sessionFiles[i]);
      require('node:fs').utimesSync(fp, oldTime / 1000, oldTime / 1000);
    }

    // Trigger pruning by adding one more
    markSessionInjected('trigger-prune', cwd);

    // Old markers should be removed
    const remaining = require('node:fs')
      .readdirSync(cacheDir)
      .filter((f: string) => f.startsWith('session-context-')) as string[];
    expect(remaining.length).toBeLessThanOrEqual(10);
  });
});
