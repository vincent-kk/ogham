import { type SpawnSyncReturns, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// __dirname here is .../plugins/filid/src/__tests__/integration
const bundlePath = resolve(__dirname, '..', '..', '..', 'bridge', 'setup.mjs');

let bundleExists = false;
let tempDir: string;
let pluginDir: string;
let globalMarker: string;

beforeAll(() => {
  bundleExists = existsSync(bundlePath);
});

beforeEach(() => {
  tempDir = join(
    tmpdir(),
    `filid-bundle-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  pluginDir = join(tempDir, 'plugins', 'filid');
  globalMarker = join(pluginDir, '.last-prune');
  mkdirSync(pluginDir, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

function runSetup(cwd: string): SpawnSyncReturns<string> {
  return spawnSync('node', [bundlePath], {
    input: JSON.stringify({ session_id: 's', cwd }),
    env: { ...process.env, CLAUDE_CONFIG_DIR: tempDir },
    encoding: 'utf-8',
    timeout: 10_000,
  });
}

describe('setup-bundle integration', () => {
  it.skipIf(!bundleExists)('first invocation creates global marker', () => {
    runSetup(process.cwd());
    expect(existsSync(globalMarker)).toBe(true);
  });

  it.skipIf(!bundleExists)(
    'first invocation creates session marker under cwdHash dir',
    () => {
      runSetup(process.cwd());
      const entries = readdirSync(pluginDir).filter((d) => d !== '.last-prune');
      expect(entries.length).toBeGreaterThan(0);
      const sessionMarker = join(pluginDir, entries[0], '.last-prune');
      expect(existsSync(sessionMarker)).toBe(true);
    },
  );

  it.skipIf(!bundleExists)(
    'second immediate invocation does not change global marker mtime',
    () => {
      runSetup(process.cwd());
      const t1 = statSync(globalMarker).mtimeMs;
      runSetup(process.cwd());
      const t2 = statSync(globalMarker).mtimeMs;
      expect(t2).toBe(t1);
    },
  );

  it.skipIf(!bundleExists)(
    'after backdating global marker 25h, third invocation refreshes mtime',
    () => {
      runSetup(process.cwd());
      const past = Date.now() / 1000 - 25 * 3600;
      utimesSync(globalMarker, past, past);
      const t1 = statSync(globalMarker).mtimeMs;
      runSetup(process.cwd());
      const t2 = statSync(globalMarker).mtimeMs;
      expect(t2).toBeGreaterThan(t1);
    },
  );

  it.skipIf(!bundleExists)(
    'bundle exits with status 0 and emits parseable JSON',
    () => {
      const r = runSetup(process.cwd());
      expect(r.status).toBe(0);
      const lines = r.stdout.trim().split('\n').filter(Boolean);
      const last = lines[lines.length - 1];
      const parsed = JSON.parse(last);
      expect(parsed.continue).toBe(true);
    },
  );
});
