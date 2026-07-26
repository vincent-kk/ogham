import { resolve } from 'node:path';

import { createAdapterRegistry } from '../../../../adapters/index.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../../constants/scanDefaults.js';
import type { FractalTree } from '../../../../types/fractal.js';
import type { ScanOptions } from '../../../../types/scan.js';
import { buildFractalTree } from '../treeBuilder/buildFractalTree.js';

import { collectNodeMetadata } from './collectNodeMetadata.js';
import { correctNodeTypes } from './correctNodeTypes.js';
import { discoverDirectories } from './discoverDirectories.js';

export async function scanProject(
  rootPath: string,
  options?: ScanOptions,
): Promise<FractalTree> {
  const absoluteRoot = resolve(rootPath);
  const structureAdapters =
    options?.structureAdapters ??
    (await createAdapterRegistry().resolveStructure(absoluteRoot));
  const opts: Required<ScanOptions> = {
    ...DEFAULT_SCAN_OPTIONS,
    ...options,
    structureAdapters,
  };
  const allDirs = await discoverDirectories(absoluteRoot, opts);
  const { nodeEntries, childrenMap } = await collectNodeMetadata(
    allDirs,
    absoluteRoot,
    opts,
    structureAdapters,
  );
  return buildFractalTree(
    correctNodeTypes(nodeEntries, childrenMap, opts.additionalOrganNames),
  );
}
