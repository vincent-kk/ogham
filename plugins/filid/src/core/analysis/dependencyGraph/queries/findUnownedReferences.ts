import type { DependencyReference } from '../../../../types/adapters.js';
import { canonicalizeNodePaths } from '../builders/canonicalizeNodePaths.js';
import { resolveOwnerPath } from '../builders/resolveOwnerPath.js';
import { sortPathsDeepestFirst } from '../builders/sortPathsDeepestFirst.js';

/** A reference whose source or resolved-target file no non-organ owner contains. */
export interface UnownedReference {
  reference: DependencyReference;
  /** The reference's source or resolved-target path that no owner contains. */
  unownedPath: string;
}

export interface FindUnownedReferencesOptions {
  /** Reference source files exempted from this check. */
  verificationPaths?: readonly string[];
}

/**
 * Find references whose source or resolved-target file falls outside every
 * non-organ owner node — the same gap `buildDependencyGraph` silently drops
 * into an indeterminate certainty with no diagnostic to explain why.
 *
 * Judges references in the same order and with the same skips as the
 * builder: an indeterminate or unresolved reference is skipped before
 * ownership is judged, and a verification-file reference is exempt.
 * @param nodePaths Non-organ owner candidate paths.
 * @param references Adapter-reported dependency references.
 * @param options Verification file paths exempted from this check.
 * @returns One entry per reference with a missing source or target owner.
 */
export function findUnownedReferences(
  nodePaths: readonly string[],
  references: readonly DependencyReference[],
  options: FindUnownedReferencesOptions = {},
): UnownedReference[] {
  const nodePathsDeepestFirst = sortPathsDeepestFirst(
    canonicalizeNodePaths(nodePaths),
  );
  const verificationPaths = new Set(options.verificationPaths ?? []);
  const results: UnownedReference[] = [];

  for (const reference of references) {
    if (reference.certainty === 'indeterminate') continue;
    if (reference.resolvedPath === null) continue;
    if (verificationPaths.has(reference.sourceFile)) continue;

    if (!resolveOwnerPath(nodePathsDeepestFirst, reference.sourceFile)) {
      results.push({ reference, unownedPath: reference.sourceFile });
      continue;
    }
    if (!resolveOwnerPath(nodePathsDeepestFirst, reference.resolvedPath))
      results.push({ reference, unownedPath: reference.resolvedPath });
  }

  return results;
}
