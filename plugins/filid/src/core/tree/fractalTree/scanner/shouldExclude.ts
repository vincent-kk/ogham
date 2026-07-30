import { DEFAULT_SCAN_OPTIONS } from '../../../../constants/scanDefaults.js';
import type { ScanOptions } from '../../../../types/scan.js';

const PATH_SEPARATOR = /[\\/]/;
const GLOB_PREFIX = /^\*\*\//;
const GLOB_SUFFIX = /\/\*\*$/;

/**
 * Whether a pattern covers a candidate path.
 * A pattern opening with the recursive `**` prefix — or one carrying no glob at
 * all, which is a bare directory name — matches its segment run wherever that
 * run appears. Anything else stays anchored at the scanned root.
 * @param segments Root-relative path segments of the candidate.
 * @param pattern One `ScanOptions.exclude` pattern or excluded directory name.
 * @returns True when the pattern covers the candidate.
 */
function matchesPattern(segments: readonly string[], pattern: string): boolean {
  const anyDepth = GLOB_PREFIX.test(pattern) || !pattern.includes('*');
  const base = pattern.replace(GLOB_PREFIX, '').replace(GLOB_SUFFIX, '');
  if (!base) return false;
  const parts = base.split(PATH_SEPARATOR);
  const lastStart = anyDepth ? segments.length - parts.length : 0;
  for (let start = 0; start <= lastStart; start += 1)
    if (parts.every((part, index) => segments[start + index] === part))
      return true;
  return false;
}

/**
 * Determine if a relative path should be excluded based on ScanOptions.
 * Exclusion has two declared sources and one matcher: the built-in or
 * caller-supplied `exclude` patterns, and the config-supplied directory names,
 * which are bare names and therefore match at any depth.
 * @param relPath Path relative to the scanned root.
 * @param options Scan options; omitted fields fall back to the built-in defaults.
 * @returns True when the path is excluded from the scan.
 */
export function shouldExclude(relPath: string, options: ScanOptions): boolean {
  const segments = relPath.split(PATH_SEPARATOR);
  const patterns = [
    ...(options.exclude ?? DEFAULT_SCAN_OPTIONS.exclude),
    ...(options.additionalExcludedDirectories ??
      DEFAULT_SCAN_OPTIONS.additionalExcludedDirectories),
  ];
  return patterns.some((pattern) => matchesPattern(segments, pattern));
}
