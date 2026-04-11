import type { ScanOptions } from '../../../../types/scan.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../../types/scan.js';

/**
 * Determine if a relative path should be excluded based on ScanOptions.
 * Uses simple string prefix matching for exclude patterns.
 */
export function shouldExclude(relPath: string, options: ScanOptions): boolean {
  const excludePatterns = options.exclude ?? DEFAULT_SCAN_OPTIONS.exclude;
  for (const pattern of excludePatterns) {
    // Strip leading **/ for simple prefix matching
    const normalized = pattern.replace(/^\*\*\//, '');
    if (
      relPath === normalized ||
      relPath.startsWith(normalized + '/') ||
      relPath.includes('/' + normalized + '/') ||
      relPath.endsWith('/' + normalized)
    ) {
      return true;
    }
    // Handle exact glob like node_modules/**
    const base = normalized.replace(/\/\*\*$/, '');
    if (relPath === base || relPath.startsWith(base + '/')) {
      return true;
    }
  }
  return false;
}
