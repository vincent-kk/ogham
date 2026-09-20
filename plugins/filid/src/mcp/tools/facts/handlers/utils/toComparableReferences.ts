import {
  isProjectFilePathValid,
  locateSourceText,
} from '../../../../../core/facts/index.js';
import type {
  ComparableReference,
  FactsReference,
} from '../../../../../core/facts/index.js';

/**
 * Reduce a candidate's references to what comparison is defined on.
 *
 * The same two checks a submission passes, applied before anything reaches the
 * side table: a reference whose string is not in the file is dropped, and a
 * resolution that leaves the project, crosses a link or names a directory is
 * demoted to "no edge" rather than being judged. Without that, an over-reporting
 * or simply wrong tool could fill the table with items no one can act on
 * (spec §4.5).
 *
 * @param references - References the candidate reported for one file.
 * @param lines - That file's current contents, split into lines.
 * @param projectRoot - Absolute project root every resolution is judged against.
 * @param scannedPaths - Paths the scan reports; anything else carries no edge.
 * @returns One comparable reference per surviving candidate reference.
 */
export function toComparableReferences(
  references: readonly FactsReference[],
  lines: readonly string[],
  projectRoot: string,
  scannedPaths: ReadonlySet<string>,
): ComparableReference[] {
  return references.flatMap((reference): ComparableReference[] => {
    const text = reference.sourceText ?? reference.specifier;
    if (locateSourceText(lines, text).length === 0) return [];
    const target =
      'path' in reference.resolved ? reference.resolved.path : null;
    const carriesEdge =
      target !== null &&
      scannedPaths.has(target) &&
      isProjectFilePathValid(projectRoot, target);
    return [
      {
        reference: text,
        kind: reference.kind,
        resolvedPath: carriesEdge ? target : null,
      },
    ];
  });
}
