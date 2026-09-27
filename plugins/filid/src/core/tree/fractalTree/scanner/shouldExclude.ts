import { DEFAULT_SCAN_OPTIONS } from '../../../../constants/scanDefaults.js';
import { matchesPathPattern } from '../../../../lib/matchesPathPattern.js';
import type { ScanOptions } from '../../../../types/scan.js';

/** The single path predicate shared by directory and file collection. */
export function shouldExclude(relPath: string, options: ScanOptions): boolean {
  return (options.exclude ?? DEFAULT_SCAN_OPTIONS.exclude).some((pattern) =>
    matchesPathPattern(pattern, relPath),
  );
}
