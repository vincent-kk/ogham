import {
  chmodSync,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  PRUNE_MARKER_FILENAME,
  PRUNE_THROTTLE_MS,
} from '../../../constants/infra-defaults.js';

const cwd = '/some/test/project';
let tempDir: string;
let cacheDir: string;
let markerPath: string;

beforeEach(async () => {
  tempDir = join(
    tmpdir(),
    `filid-throttle-s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  process.env.CLAUDE_CONFIG_DIR = tempDir;
  const { getCacheDir } = await import(
    '../../../core/infra/cache-manager/cache-manager.js'
  );
  cacheDir = getCacheDir(cwd);
  markerPath = join(cacheDir, PRUNE_MARKER_FILENAME);
  mkdirSync(cacheDir, { recursive: true });
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  try {
    chmodSync(cacheDir, 0o755);
  } catch {
    /* ignore */
  }
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('prune-throttle (session)', () => {
  // Basic (3)
  it('isSessionPruneDue: returns true when marker absent', async () => {
    const { isSessionPruneDue } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    expect(isSessionPruneDue(cwd)).toBe(true);
  });

  it('markSessionPruneRun: creates marker at <cacheDir>/.last-prune', async () => {
    const { markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    expect(existsSync(markerPath)).toBe(true);
  });

  it('round-trip: after markSessionPruneRun, isSessionPruneDue returns false', async () => {
    const { isSessionPruneDue, markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    expect(isSessionPruneDue(cwd)).toBe(false);
  });

  // Edge — backdate / boundary (4)
  it('isSessionPruneDue: returns true when backdated 25h', async () => {
    const { isSessionPruneDue, markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    const past = Date.now() / 1000 - 25 * 3600;
    utimesSync(markerPath, past, past);
    expect(isSessionPruneDue(cwd)).toBe(true);
  });

  it('isSessionPruneDue: returns false when 1h ago', async () => {
    const { isSessionPruneDue, markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    const past = Date.now() / 1000 - 3600;
    utimesSync(markerPath, past, past);
    expect(isSessionPruneDue(cwd)).toBe(false);
  });

  it('isSessionPruneDue: boundary — just inside PRUNE_THROTTLE_MS returns false', async () => {
    const { isSessionPruneDue, markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    // 1s buffer absorbs ms-level drift between Date.now() and isSessionPruneDue();
    // the impl uses strict `>` so any positive delta past the boundary flips.
    const past = (Date.now() - PRUNE_THROTTLE_MS + 1000) / 1000;
    utimesSync(markerPath, past, past);
    expect(isSessionPruneDue(cwd)).toBe(false);
  });

  it('markSessionPruneRun: twice-called updates mtime', async () => {
    const { markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    const past = Date.now() / 1000 - 25 * 3600;
    utimesSync(markerPath, past, past);
    const before = statSync(markerPath).mtimeMs;
    markSessionPruneRun(cwd);
    const after = statSync(markerPath).mtimeMs;
    expect(after).toBeGreaterThan(before);
  });

  // Edge — cwd / paths (3)
  it('different cwd values produce independent markers', async () => {
    const { getCacheDir, isSessionPruneDue, markSessionPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    const cwdA = '/proj/a';
    const cwdB = '/proj/b';
    mkdirSync(getCacheDir(cwdA), { recursive: true });
    mkdirSync(getCacheDir(cwdB), { recursive: true });
    markSessionPruneRun(cwdA);
    expect(isSessionPruneDue(cwdA)).toBe(false);
    expect(isSessionPruneDue(cwdB)).toBe(true);
  });

  it('markSessionPruneRun: creates cacheDir when missing', async () => {
    rmSync(cacheDir, { recursive: true, force: true });
    expect(existsSync(cacheDir)).toBe(false);
    const { markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    expect(existsSync(markerPath)).toBe(true);
  });

  it('markSessionPruneRun: works under non-existent plugin root (mkdir recursive)', async () => {
    rmSync(tempDir, { recursive: true, force: true });
    const { markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    expect(existsSync(markerPath)).toBe(true);
  });

  // Edge — failure modes (5)
  it('isSessionPruneDue: marker is a directory → returns true', async () => {
    mkdirSync(markerPath, { recursive: true });
    const { isSessionPruneDue } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    expect(isSessionPruneDue(cwd)).toBe(true);
  });

  it.skipIf(process.platform === 'win32')(
    'markSessionPruneRun: swallows writeFileSync error silently',
    async () => {
      const { markSessionPruneRun } = await import(
        '../../../core/infra/cache-manager/cache-manager.js'
      );
      chmodSync(cacheDir, 0o555);
      try {
        expect(() => markSessionPruneRun(cwd)).not.toThrow();
      } finally {
        chmodSync(cacheDir, 0o755);
      }
    },
  );

  it('end-to-end: backdate → due → mark → not due', async () => {
    const { isSessionPruneDue, markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    const past = Date.now() / 1000 - 25 * 3600;
    utimesSync(markerPath, past, past);
    expect(isSessionPruneDue(cwd)).toBe(true);
    markSessionPruneRun(cwd);
    expect(isSessionPruneDue(cwd)).toBe(false);
  });

  it('markSessionPruneRun: overwrites existing marker mtime', async () => {
    const { markSessionPruneRun } = await import(
      '../../../core/infra/cache-manager/cache-manager.js'
    );
    markSessionPruneRun(cwd);
    const past = Date.now() / 1000 - 10 * 3600;
    utimesSync(markerPath, past, past);
    const before = statSync(markerPath).mtimeMs;
    markSessionPruneRun(cwd);
    const after = statSync(markerPath).mtimeMs;
    expect(after).toBeGreaterThan(before);
  });

  it.skipIf(process.platform === 'win32')(
    'after silent mark failure, isSessionPruneDue returns true',
    async () => {
      const { isSessionPruneDue, markSessionPruneRun } = await import(
        '../../../core/infra/cache-manager/cache-manager.js'
      );
      rmSync(markerPath, { force: true });
      chmodSync(cacheDir, 0o555);
      try {
        markSessionPruneRun(cwd);
        expect(isSessionPruneDue(cwd)).toBe(true);
      } finally {
        chmodSync(cacheDir, 0o755);
      }
    },
  );
});
