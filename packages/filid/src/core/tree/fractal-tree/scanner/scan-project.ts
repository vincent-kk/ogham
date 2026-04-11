import type { FractalTree } from '../../../../types/fractal.js';
import type { ScanOptions } from '../../../../types/scan.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../../types/scan.js';
import { buildFractalTree } from '../tree-builder/build-fractal-tree.js';
import { collectNodeMetadata } from './collect-node-metadata.js';
import { correctNodeTypes } from './correct-node-types.js';
import { detectFrameworkReserved } from './detect-frameworks.js';
import { discoverDirectories } from './discover-directories.js';

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
