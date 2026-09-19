import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { listScannedFilePaths } from '../../../core/tree/fractalTree/scanner/listScannedFilePaths.js';
import type { ScanOptions } from '../../../types/scan.js';
import { scanProject } from '../../../core/tree/fractalTree/scanner/scanProject.js';

const REPOSITORY_SUBTREE = new URL('../../../core/tree/', import.meta.url)
  .pathname;

const HARNESS_FIXTURE = new URL(
  '../../integration/reviewFlow/fixtures/preserved-s0/',
  import.meta.url,
).pathname;

const temporaryRoots: string[] = [];

afterEach(() => {
  while (temporaryRoots.length > 0)
    rmSync(temporaryRoots.pop() as string, { recursive: true, force: true });
});

/**
 * The file set the fractal scan records, as project-relative POSIX paths.
 * @param root Project root the scan ran against.
 * @param options Scan options, passed to both sides of an equality check.
 * @returns Every `peerFiles` entry of every node, flattened.
 */
async function scannedPeerFiles(
  root: string,
  options?: ScanOptions,
): Promise<string[]> {
  const tree = await scanProject(root, options);
  return [...tree.nodes.values()].flatMap((node) =>
    node.peerFiles.map((file) =>
      relative(root, join(node.path, file)).split(sep).join('/'),
    ),
  );
}

/**
 * Create a throwaway project tree outside the repository.
 * @param files Project-relative POSIX paths mapped to their contents.
 * @returns Absolute path of the created root.
 */
function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'filid-scanned-paths-'));
  temporaryRoots.push(root);
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, ...path.split('/'));
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, contents);
  }
  return root;
}

describe('listScannedFilePaths', () => {
  it('returns exactly the file set the repository scan collects', async () => {
    const expected = await scannedPeerFiles(REPOSITORY_SUBTREE);

    const actual = await listScannedFilePaths(REPOSITORY_SUBTREE);

    expect([...actual].sort()).toEqual([...new Set(expected)].sort());
  });

  it('returns exactly the file set the harness fixture scan collects', async () => {
    const expected = await scannedPeerFiles(HARNESS_FIXTURE);

    const actual = await listScannedFilePaths(HARNESS_FIXTURE);

    expect([...actual].sort()).toEqual([...new Set(expected)].sort());
  });

  it('omits dot entries, excluded directories and files below excluded ones', async () => {
    const root = createProject({
      'src/index.ts': 'export {};',
      'src/.hidden.ts': 'export {};',
      'node_modules/pkg/index.js': 'module.exports = {};',
      'dist/bundle.js': 'globalThis.x = 1;',
      'README.md': '# project',
    });

    const actual = await listScannedFilePaths(root);

    expect(actual).toEqual(['README.md', 'src/index.ts']);
  });

  it('agrees with the scan when the tree runs deeper than the default cap', async () => {
    const deep = 'a/b/c/d/e/f/g/h/i/j/k/l/deep.ts';
    const root = createProject({
      'src/index.ts': 'export {};',
      [deep]: 'export const deep = 1;',
    });
    const options: ScanOptions = { maxDepth: Number.MAX_SAFE_INTEGER };

    const actual = await listScannedFilePaths(root, options);

    expect(actual).toContain(deep);
    expect([...actual].sort()).toEqual(
      [...new Set(await scannedPeerFiles(root, options))].sort(),
    );
  });

  it('drops the deep file under the built-in cap, so the options must match the scan', async () => {
    const deep = 'a/b/c/d/e/f/g/h/i/j/k/l/deep.ts';
    const root = createProject({
      'src/index.ts': 'export {};',
      [deep]: 'export const deep = 1;',
    });

    expect(await listScannedFilePaths(root)).not.toContain(deep);
  });

  it('honours config-supplied excluded directory names', async () => {
    const root = createProject({
      'src/index.ts': 'export {};',
      'generated/out.ts': 'export {};',
    });
    const options: ScanOptions = {
      additionalExcludedDirectories: ['generated'],
    };

    const actual = await listScannedFilePaths(root, options);

    expect(actual).toEqual(['src/index.ts']);
    expect([...actual].sort()).toEqual(
      [...new Set(await scannedPeerFiles(root, options))].sort(),
    );
  });

  it('sorts by raw bytes, not by locale', async () => {
    const root = createProject({
      'Zeta.ts': 'export {};',
      'alpha.ts': 'export {};',
    });

    const actual = await listScannedFilePaths(root);

    expect(actual).toEqual(['Zeta.ts', 'alpha.ts']);
  });
});
