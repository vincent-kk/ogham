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

let tempDir: string;
let pluginDir: string;
let markerPath: string;

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `filid-throttle-g-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  pluginDir = join(tempDir, 'plugins', 'filid');
  markerPath = join(pluginDir, PRUNE_MARKER_FILENAME);
  mkdirSync(pluginDir, { recursive: true });
  process.env.CLAUDE_CONFIG_DIR = tempDir;
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  try {
    chmodSync(pluginDir, 0o755);
  } catch {
    /* ignore */
  }
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('prune-throttle (global)', () => {
  // Basic (3) — happy-path round-trip
  it('isPruneDue: returns true when marker absent', async () => {
    const { isPruneDue } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    expect(isPruneDue()).toBe(true);
  });

  it('markPruneRun: creates marker file at <pluginRoot>/.last-prune', async () => {
    const { markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    expect(existsSync(markerPath)).toBe(true);
  });

  it('round-trip: after markPruneRun, isPruneDue returns false', async () => {
    const { isPruneDue, markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    expect(isPruneDue()).toBe(false);
  });

  // Edge — backdate / boundary (4)
  it('isPruneDue: returns true when marker mtime backdated 25h', async () => {
    const { isPruneDue, markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    const past = Date.now() / 1000 - 25 * 3600;
    utimesSync(markerPath, past, past);
    expect(isPruneDue()).toBe(true);
  });

  it('isPruneDue: returns false when marker mtime is 1h ago', async () => {
    const { isPruneDue, markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    const past = Date.now() / 1000 - 3600;
    utimesSync(markerPath, past, past);
    expect(isPruneDue()).toBe(false);
  });

  it('isPruneDue: boundary — just inside PRUNE_THROTTLE_MS returns false', async () => {
    const { isPruneDue, markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    // 1s buffer absorbs ms-level drift between Date.now() and isPruneDue();
    // the impl uses strict `>` so any positive delta past the boundary flips.
    const past = (Date.now() - PRUNE_THROTTLE_MS + 1000) / 1000;
    utimesSync(markerPath, past, past);
    expect(isPruneDue()).toBe(false);
  });

  it('markPruneRun: called twice updates mtime (re-throttle works)', async () => {
    const { markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    const past = Date.now() / 1000 - 25 * 3600;
    utimesSync(markerPath, past, past);
    const before = statSync(markerPath).mtimeMs;
    markPruneRun();
    const after = statSync(markerPath).mtimeMs;
    expect(after).toBeGreaterThan(before);
  });

  // Edge — env / paths (3)
  it('honors CLAUDE_CONFIG_DIR override (marker lands in tempDir)', async () => {
    const { markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    expect(markerPath.startsWith(tempDir)).toBe(true);
    expect(existsSync(markerPath)).toBe(true);
  });

  it('markPruneRun: creates <configDir>/plugins/filid when missing', async () => {
    rmSync(pluginDir, { recursive: true, force: true });
    expect(existsSync(pluginDir)).toBe(false);
    const { markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    expect(existsSync(markerPath)).toBe(true);
  });

  it('isPruneDue: plugin root missing → returns true', async () => {
    rmSync(pluginDir, { recursive: true, force: true });
    const { isPruneDue } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    expect(isPruneDue()).toBe(true);
  });

  // Edge — failure modes (5)
  it('isPruneDue: marker path is a directory → returns true', async () => {
    mkdirSync(markerPath, { recursive: true });
    const { isPruneDue } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    expect(isPruneDue()).toBe(true);
  });

  it.skipIf(process.platform === 'win32')(
    'markPruneRun: swallows write error silently (read-only parent)',
    async () => {
      const { markPruneRun } =
        await import('../../../core/infra/cache-manager/cache-manager.js');
      rmSync(markerPath, { force: true });
      chmodSync(pluginDir, 0o555);
      try {
        expect(() => markPruneRun()).not.toThrow();
        expect(existsSync(markerPath)).toBe(false);
      } finally {
        chmodSync(pluginDir, 0o755);
      }
    },
  );

  it('end-to-end: backdate → due → mark → not due', async () => {
    const { isPruneDue, markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    const past = Date.now() / 1000 - 25 * 3600;
    utimesSync(markerPath, past, past);
    expect(isPruneDue()).toBe(true);
    markPruneRun();
    expect(isPruneDue()).toBe(false);
  });

  it('markPruneRun: overwrites mtime when called on existing marker', async () => {
    const { markPruneRun } =
      await import('../../../core/infra/cache-manager/cache-manager.js');
    markPruneRun();
    const past = Date.now() / 1000 - 10 * 3600;
    utimesSync(markerPath, past, past);
    const before = statSync(markerPath).mtimeMs;
    markPruneRun();
    const after = statSync(markerPath).mtimeMs;
    expect(after).toBeGreaterThan(before);
  });

  it.skipIf(process.platform === 'win32')(
    'after silent markPruneRun failure, isPruneDue still returns true',
    async () => {
      const { isPruneDue, markPruneRun } =
        await import('../../../core/infra/cache-manager/cache-manager.js');
      rmSync(markerPath, { force: true });
      chmodSync(pluginDir, 0o555);
      try {
        markPruneRun();
        expect(isPruneDue()).toBe(true);
      } finally {
        chmodSync(pluginDir, 0o755);
      }
    },
  );
});
