import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { projectRoot, spawnCliSync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAdapterRegistry } from '../../../adapters/index.js';
import {
  createDefaultConfig,
  createProjectSnapshot,
  loadConfig,
} from '../../../core/index.js';
import { createToolSnapshot } from '../../../mcp/tools/utils/createToolSnapshot.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';

vi.mock('@ogham/cross-platform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ogham/cross-platform')>();
  return { ...actual, spawnCliSync: vi.fn(actual.spawnCliSync) };
});

const mockedSpawnCliSync = vi.mocked(spawnCliSync);

let root: string;

/**
 * How many times the ignored-path query reached git since the last clear.
 *
 * It is the one git command the scan repeats per source-tree walk, so it
 * counts the walks a snapshot paid for.
 */
function listFilesSpawnCount(): number {
  return mockedSpawnCliSync.mock.calls.filter(
    ([command, args]) => command === 'git' && args[0] === 'ls-files',
  ).length;
}

/** The snapshot minus the one field that moves on its own: when it was built. */
function comparable(snapshot: ProjectSnapshot): string {
  return JSON.stringify(snapshot, (key: string, value: unknown) =>
    key === 'createdAt' ? undefined : value,
  );
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'filid-scan-memo-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'INTENT.md'), '# fixture\n');
  writeFileSync(join(root, '.gitignore'), 'generated/\n');
  writeFileSync(
    join(root, 'index.ts'),
    "export { unit } from './src/unit.js';\n",
  );
  writeFileSync(join(root, 'src', 'unit.ts'), 'export const unit = 1;\n');
  writeFileSync(join(root, 'src', 'unit.test.ts'), "it('holds', () => {});\n");
  spawnCliSync('git', ['init', '--quiet'], { cwd: root });
  spawnCliSync('git', ['config', 'user.email', 'unit@filid.test'], {
    cwd: root,
  });
  spawnCliSync('git', ['config', 'user.name', 'filid unit'], { cwd: root });
  mockedSpawnCliSync.mockClear();
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('createToolSnapshot scan memo', () => {
  it('asks git for ignored paths once per snapshot', async () => {
    await createToolSnapshot(root);
    expect(listFilesSpawnCount()).toBe(1);
  });

  it('asks again for the next snapshot, so the memo outlives no call', async () => {
    await createToolSnapshot(root);
    mockedSpawnCliSync.mockClear();
    await createToolSnapshot(root);
    expect(listFilesSpawnCount()).toBe(1);
  });

  it('builds the snapshot an unmemoized build builds', async () => {
    const memoized = await createToolSnapshot(root);
    const unmemoized = await createProjectSnapshot(
      projectRoot(root),
      createAdapterRegistry(),
      loadConfig(projectRoot(root)).config ?? createDefaultConfig(),
      {},
    );
    expect(memoized.snapshot.snapshotHash).toBe(unmemoized.snapshotHash);
    expect(comparable(memoized.snapshot)).toBe(comparable(unmemoized));
  });
});
