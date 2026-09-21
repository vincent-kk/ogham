import { FACTS_RESOLUTION_CONFIG_PATTERNS } from '../../../constants/facts.js';
import { globToRegExp } from '../../../lib/globToRegexp.js';

/** Compiled once: the default resolution-input patterns never change at runtime. */
const DEFAULT_PATTERNS = FACTS_RESOLUTION_CONFIG_PATTERNS.map(globToRegExp);

/**
 * The project files whose contents the resolution epoch depends on (spec §2.2).
 *
 * Only the project's own manifests and lockfiles, matched by basename — a
 * manifest governs resolution for the directory it sits in, wherever that is,
 * and a workspace has one per package.
 *
 * Inputs that individual records declare are not here. Including them would let
 * accepting a record move the next epoch, which turns a split submission into a
 * loop: the second batch is refused against an epoch the first batch shifted.
 * Declared inputs bind their own record instead.
 *
 * @param scannedPaths - Project-relative POSIX paths the scan reports.
 * @returns Matching paths in the order they were scanned, which is already
 * raw-byte sorted.
 */
export function collectDefaultResolutionInputs(
  scannedPaths: readonly string[],
): string[] {
  return scannedPaths.filter((path) =>
    DEFAULT_PATTERNS.some((pattern) =>
      pattern.test(path.slice(path.lastIndexOf('/') + 1)),
    ),
  );
}
