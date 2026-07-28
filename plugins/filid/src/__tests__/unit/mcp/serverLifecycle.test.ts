import {
  existsSync,
  mkdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getCacheDir,
  sessionIdHash,
} from '../../../core/infra/cacheManager/index.js';
import { bootSweep } from '../../../mcp/server/lifecycle/bootSweep.js';
import { cleanupOwnSessionCache } from '../../../mcp/server/lifecycle/cleanupOwnSessionCache.js';
import { registerShutdown } from '../../../mcp/server/lifecycle/registerShutdown.js';

let tempDir: string;
let savedSessionId: string | undefined;

function writeSessionFiles(cwd: string, sessionId: string): string[] {
  const dir = getCacheDir(cwd);
  mkdirSync(dir, { recursive: true });
  const hash = sessionIdHash(sessionId);
  const files = [
    join(dir, `session-context-${hash}`),
    join(dir, `prompt-context-${hash}`),
    join(dir, `boundary-${hash}`),
    join(dir, `fmap-${hash}.json`),
    join(dir, `guide-${hash}`),
  ];
  for (const f of files) writeFileSync(f, 'x');
  return files;
}

function ageFile(path: string, hoursAgo: number): void {
  const t = new Date(Date.now() - hoursAgo * 3_600_000);
  utimesSync(path, t, t);
}

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `filid-lifecycle-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(tempDir, { recursive: true });
  process.env.CLAUDE_CONFIG_DIR = tempDir;
  savedSessionId = process.env.CLAUDE_CODE_SESSION_ID;
  delete process.env.CLAUDE_CODE_SESSION_ID;
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  if (savedSessionId === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
  else process.env.CLAUDE_CODE_SESSION_ID = savedSessionId;
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup failures
  }
});

describe('mcp server lifecycle — bootSweep', () => {
  // Test 1: expired sessions beyond the threshold are pruned on boot
  it('prunes expired session files when the prune gate is due', () => {
    const cwd = '/proj/lifecycle';
    const allFiles: string[][] = [];
    for (let i = 0; i < 11; i++)
      allFiles.push(writeSessionFiles(cwd, `session-${i}`));
    for (const files of allFiles) for (const f of files) ageFile(f, 25);

    bootSweep(cwd);

    for (const files of allFiles)
      for (const f of files) expect(existsSync(f)).toBe(false);
  });

  // Test 2: a second sweep in the same day is throttled by the marker gate
  it('is idempotent and throttled: double run stays safe and skips prune', () => {
    const cwd = '/proj/lifecycle';
    bootSweep(cwd);

    const files = writeSessionFiles(cwd, 'session-after-mark');
    for (const f of files) ageFile(f, 25);
    bootSweep(cwd);

    for (const f of files) expect(existsSync(f)).toBe(true);
  });

  // Test 3: fresh session files survive the sweep (TTL guard)
  it('keeps fresh session files even when the gate is due', () => {
    const cwd = '/proj/lifecycle';
    const stale: string[][] = [];
    for (let i = 0; i < 11; i++)
      stale.push(writeSessionFiles(cwd, `stale-${i}`));
    for (const files of stale) for (const f of files) ageFile(f, 25);
    const fresh = writeSessionFiles(cwd, 'fresh-session');

    bootSweep(cwd);

    for (const f of fresh) expect(existsSync(f)).toBe(true);
  });

  // Test 4: never throws, even for an unusable cwd
  it('absorbs failures instead of throwing', () => {
    expect(() => bootSweep('invalid')).not.toThrow();
  });
});

describe('mcp server lifecycle — shutdown cleanup', () => {
  // Test 5: removes exactly this session's cache files using the env session id
  it('cleanupOwnSessionCache removes files for CLAUDE_CODE_SESSION_ID', () => {
    const cwd = process.cwd();
    const own = writeSessionFiles(cwd, 'env-session');
    const other = writeSessionFiles(cwd, 'other-session');
    process.env.CLAUDE_CODE_SESSION_ID = 'env-session';

    cleanupOwnSessionCache();

    for (const f of own) expect(existsSync(f)).toBe(false);
    for (const f of other) expect(existsSync(f)).toBe(true);
  });

  // Test 6: without the env var the cleanup is a silent no-op
  it('cleanupOwnSessionCache is a no-op without CLAUDE_CODE_SESSION_ID', () => {
    const cwd = process.cwd();
    const files = writeSessionFiles(cwd, 'orphan-session');

    cleanupOwnSessionCache();

    for (const f of files) expect(existsSync(f)).toBe(true);
  });

  // Test 7: handler registration is once-only across repeated calls
  it('registerShutdown registers its handlers exactly once', () => {
    const before = {
      exit: process.listeners('exit'),
      sigint: process.listeners('SIGINT'),
      sigterm: process.listeners('SIGTERM'),
    };

    registerShutdown();
    registerShutdown();

    const added = {
      exit: process.listeners('exit').filter((l) => !before.exit.includes(l)),
      sigint: process
        .listeners('SIGINT')
        .filter((l) => !before.sigint.includes(l)),
      sigterm: process
        .listeners('SIGTERM')
        .filter((l) => !before.sigterm.includes(l)),
    };
    expect(added.exit).toHaveLength(1);
    expect(added.sigint).toHaveLength(1);
    expect(added.sigterm).toHaveLength(1);

    for (const l of added.exit) process.removeListener('exit', l);
    for (const l of added.sigint) process.removeListener('SIGINT', l);
    for (const l of added.sigterm) process.removeListener('SIGTERM', l);
  });
});
