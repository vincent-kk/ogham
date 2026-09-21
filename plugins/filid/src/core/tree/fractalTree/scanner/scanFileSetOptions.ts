import type { FilidConfig } from '../../../infra/configLoader/index.js';
import type { ScanOptions } from '../../../../types/scan.js';

/**
 * The scan options that decide which FILES a scan collects.
 *
 * Single source for every caller that must see the same file set as the project
 * snapshot. Only two options change that set:
 *
 * - `maxDepth` is unbounded. The snapshot always walks the tree in full;
 *   `structure.maxDepth` is a rule threshold, not a traversal limit, so the
 *   built-in default of 10 would silently drop files the snapshot holds —
 *   this repository has directories twelve levels deep.
 * - `additionalExcludedDirectories` comes from config, so a project that
 *   declares extra excluded names excludes them everywhere.
 *
 * Every other scan option steers entry-point discovery or node classification,
 * neither of which changes the set of peer files.
 *
 * @param config - Merged project configuration, or undefined when none loaded.
 * @returns Options to pass to `listScannedFilePaths` or `scanProject`.
 */
export function scanFileSetOptions(config?: FilidConfig): ScanOptions {
  return {
    maxDepth: Number.MAX_SAFE_INTEGER,
    additionalExcludedDirectories:
      config?.structure?.additionalExcludedDirectories,
  };
}
