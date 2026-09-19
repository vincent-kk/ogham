import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  collectDefaultResolutionInputs,
  computeResolutionEpoch,
  diffEpochSnapshots,
} from '../../../core/facts/index.js';
import { listScannedFilePaths } from '../../../core/tree/fractalTree/index.js';

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0)
    rmSync(roots.pop() as string, { recursive: true, force: true });
});

/**
 * Create a throwaway project outside any symbolic link.
 * @param files Project-relative POSIX paths mapped to their contents.
 * @returns Absolute project root.
 */
function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(realpathSync(tmpdir()), 'filid-epoch-'));
  roots.push(root);
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, ...path.split('/'));
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, contents);
  }
  return root;
}

/**
 * Compute a project's epoch the way the facts tool does.
 * @param root Absolute project root.
 * @returns The epoch snapshot.
 */
async function epochOf(root: string) {
  const scanned = await listScannedFilePaths(root);
  return computeResolutionEpoch(
    root,
    scanned,
    collectDefaultResolutionInputs(scanned),
  );
}

describe('resolutionEpoch', () => {
  it('does not move when only a source file body changes', async () => {
    const root = createProject({
      'package.json': '{"name":"p"}',
      'src/a.ts': 'export const a = 1;\n',
    });
    const before = await epochOf(root);

    writeFileSync(join(root, 'src', 'a.ts'), 'export const a = 999;\n');
    const after = await epochOf(root);

    expect(after.resolutionEpoch).toBe(before.resolutionEpoch);
  });

  it('moves when a file is added, and names it in the difference', async () => {
    const root = createProject({
      'package.json': '{"name":"p"}',
      'src/a.ts': 'export const a = 1;\n',
    });
    const before = await epochOf(root);

    writeFileSync(join(root, 'src', 'util.ts'), 'export const u = 1;\n');
    const after = await epochOf(root);

    expect(after.resolutionEpoch).not.toBe(before.resolutionEpoch);
    expect(diffEpochSnapshots(before, after).added).toEqual(['src/util.ts']);
  });

  it('moves when a file is removed, and names it in the difference', async () => {
    const root = createProject({
      'package.json': '{"name":"p"}',
      'src/a.ts': 'export const a = 1;\n',
      'src/gone.ts': 'export const g = 1;\n',
    });
    const before = await epochOf(root);

    rmSync(join(root, 'src', 'gone.ts'));
    const after = await epochOf(root);

    expect(after.resolutionEpoch).not.toBe(before.resolutionEpoch);
    expect(diffEpochSnapshots(before, after).removed).toEqual(['src/gone.ts']);
  });

  it('moves when a resolution input file changes content', async () => {
    const root = createProject({
      'package.json': '{"name":"p"}',
      'src/a.ts': 'export const a = 1;\n',
    });
    const before = await epochOf(root);

    writeFileSync(join(root, 'package.json'), '{"name":"p","type":"module"}');
    const after = await epochOf(root);

    expect(after.resolutionEpoch).not.toBe(before.resolutionEpoch);
    expect(diffEpochSnapshots(before, after).changedResolutionInputs).toEqual([
      'package.json',
    ]);
  });

  it('treats a manifest and a lockfile as resolution inputs and a source file as not', async () => {
    const root = createProject({
      'package.json': '{"name":"p"}',
      'yarn.lock': '# lock\n',
      'tsconfig.json': '{}',
      'src/a.ts': 'export const a = 1;\n',
    });

    const scanned = await listScannedFilePaths(root);

    expect(collectDefaultResolutionInputs(scanned)).toEqual([
      'package.json',
      'tsconfig.json',
      'yarn.lock',
    ]);
  });

  it('cannot be forged by running element boundaries together', () => {
    const root = createProject({});

    const joined = computeResolutionEpoch(root, ['a\u0000b'], []);
    const split = computeResolutionEpoch(root, ['a', 'b'], []);

    expect(joined.resolutionEpoch).not.toBe(split.resolutionEpoch);
  });

  it('separates the path list from the resolution-input list', () => {
    const root = createProject({});

    const asPath = computeResolutionEpoch(root, ['x'], []);
    const asInput = computeResolutionEpoch(root, [], ['x']);

    expect(asPath.resolutionEpoch).not.toBe(asInput.resolutionEpoch);
  });

  it('claims no difference when the previous epoch is unknown', async () => {
    const root = createProject({ 'src/a.ts': 'export const a = 1;\n' });

    const difference = diffEpochSnapshots(null, await epochOf(root));

    expect(difference).toEqual({
      added: [],
      removed: [],
      changedResolutionInputs: [],
    });
  });
});
