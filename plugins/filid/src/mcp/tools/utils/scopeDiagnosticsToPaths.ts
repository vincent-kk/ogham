import { pathForCompare } from '@ogham/cross-platform/compat/path-for-compare';

import { isPathWithin } from '../../../core/index.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

/** Diagnostics kept for one query, with the count dropped as out of scope. */
export interface ScopedDiagnostics {
  scoped: ToolDiagnostic[];
  outOfScope: number;
}

/**
 * Narrow whole-project snapshot diagnostics to the ones bearing on a query.
 * A snapshot reports every node it walked, so an unfiltered list grows with the
 * project and pushes the payload past the inline budget — which moves `data` to
 * an artifact and takes the answer out of the inline response.
 * @param diagnostics Snapshot diagnostics collected for the whole project.
 * @param scopeRoots Paths whose subtrees the query is about.
 * @param exactAddresses Extra paths kept on exact match, such as the document
 * files of an owner chain that sit outside the scoped subtrees.
 * @returns Kept diagnostics, plus how many were dropped as out of scope.
 */
export function scopeDiagnosticsToPaths(
  diagnostics: ToolDiagnostic[],
  scopeRoots: string[],
  exactAddresses: string[] = [],
): ScopedDiagnostics {
  const comparableAddresses = new Set(exactAddresses.map(pathForCompare));
  const scoped = diagnostics.filter(
    (diagnostic) =>
      !diagnostic.path ||
      scopeRoots.some((root) =>
        isPathWithin(root, diagnostic.path as string),
      ) ||
      comparableAddresses.has(pathForCompare(diagnostic.path)),
  );
  return { scoped, outOfScope: diagnostics.length - scoped.length };
}
