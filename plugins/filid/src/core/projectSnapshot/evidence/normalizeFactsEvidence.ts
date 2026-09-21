import { FACTS_FILE_STATES } from '../../../constants/facts.js';
import { compareByBytes } from '../../../lib/compareByBytes.js';
import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import type { DependencyReference } from '../../../types/adapters.js';
import type {
  NormalizedFileFacts,
  NormalizedReference,
} from '../../../types/fractal.js';
import type { FactsFileState } from '../../facts/index.js';

import type { AppliedAdjudication } from './factsDependencyReferences.js';

/**
 * Reduce this snapshot's valid references to what a review can freeze (spec §9).
 *
 * Per file and sorted, because the result is digested: two runs over the same
 * store have to produce the same bytes, and a store iteration order must not
 * decide whether a review is stale.
 *
 * Only in-project resolutions survive. A reference the provider resolved
 * nowhere, or outside the root, carries no edge for a rule to rest on, and
 * freezing the spelling of those would invalidate reviews over differences
 * that change no conclusion.
 *
 * Every file the facts scope covers gets an entry, empty where it has no edge:
 * "looked, and there was none" and "outside the scope, so nobody looked" are
 * different facts, and which of them holds is what the presence of an entry
 * says. A file the scope excludes has none — no record can exist for it.
 *
 * @param projectRoot - Absolute project root the paths are made relative to.
 * @param references - Valid references the collector drew from the store.
 * @param adjudications - The judgements whose edges are among them.
 * @param factsStates - Every scanned file's facts state; `unsupported` is the
 * one that means the declared scope excludes the file.
 * @returns One entry per in-scope file, by path.
 */
export function normalizeFactsEvidence(
  projectRoot: string,
  references: readonly DependencyReference[],
  adjudications: readonly AppliedAdjudication[],
  factsStates: ReadonlyMap<string, FactsFileState>,
): NormalizedFileFacts[] {
  const inScope = [...factsStates].filter(
    ([, state]) => state !== FACTS_FILE_STATES.UNSUPPORTED,
  );
  const byFile = new Map<string, NormalizedReference[]>();
  for (const reference of references) {
    if (reference.resolvedPath === null) continue;
    const path = toProjectRelativePath(projectRoot, reference.sourceFile);
    byFile.set(path, [
      ...(byFile.get(path) ?? []),
      {
        reference: reference.sourceText ?? reference.rawSpecifier,
        kind: reference.kind,
        resolvedPath: toProjectRelativePath(
          projectRoot,
          reference.resolvedPath,
        ),
      },
    ]);
  }
  return inScope
    .map(([path, state]) => ({
      path,
      state,
      references: (byFile.get(path) ?? []).sort(compareReferences),
      adjudications: adjudications
        .filter((item) => item.path === path)
        .map(({ reference, resolvedPath, lineDigest }) => ({
          reference,
          resolvedPath,
          lineDigest,
        }))
        .sort(
          (left, right) =>
            compareByBytes(left.reference, right.reference) ||
            compareByBytes(left.resolvedPath, right.resolvedPath),
        ),
    }))
    .sort((left, right) => compareByBytes(left.path, right.path));
}

/**
 * Order two references by what identifies them.
 * @param left One reference.
 * @param right The other.
 * @returns Negative, zero or positive, as a comparator.
 */
function compareReferences(
  left: NormalizedReference,
  right: NormalizedReference,
): number {
  return (
    compareByBytes(left.reference, right.reference) ||
    compareByBytes(left.kind, right.kind) ||
    compareByBytes(left.resolvedPath, right.resolvedPath)
  );
}
