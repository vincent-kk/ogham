import { DEFAULT_SCAN_OPTIONS } from '../../../../constants/scanDefaults.js';
import type { FractalTree } from '../../../../types/fractal.js';
import type { ScanOptions } from '../../../../types/scan.js';
import { buildFractalTree } from '../treeBuilder/buildFractalTree.js';

import { collectNodeMetadata } from './collectNodeMetadata.js';
import { correctNodeTypes } from './correctNodeTypes.js';
import { detectFrameworkReserved } from './detectFrameworks.js';
import { discoverDirectories } from './discoverDirectories.js';

/**
 * Scan a project directory and build a FractalTree.
 * Uses fast-glob to discover directories, then classifies each one.
 *
 * @param rootPath - Absolute path to project root
 * @param options - Scan options (exclude patterns, maxDepth)
 * @returns Completed FractalTree
 */
export async function scanProject(
  rootPath: string,
  options?: ScanOptions,
): Promise<FractalTree> {
  const opts = { ...DEFAULT_SCAN_OPTIONS, ...options };
  const frameworkReservedArr = detectFrameworkReserved(rootPath);
  const allDirs = await discoverDirectories(rootPath, opts);
  const { nodeEntries, childrenMap } = collectNodeMetadata(
    allDirs,
    rootPath,
    opts,
    frameworkReservedArr,
  );
  const corrected = correctNodeTypes(nodeEntries, childrenMap);
  return buildFractalTree(corrected);
}
