import { locateReference } from '../../../../../core/facts/index.js';
import type { FileFacts } from '../../../../../core/facts/index.js';

/**
 * How often a walked-back reference is still on a line nothing claims.
 *
 * The count is over lines where the reference stands as a reference, not
 * wherever its bytes occur: a restructure that moves a unit up rewrites
 * `'../c/index.js'` to `'../../c/index.js'`, which contains the old text, and
 * counting that would open an item for an edge the rewrite legitimately ended.
 *
 * @param lines - The file's current contents, split into lines.
 * @param accepted - The record that replaced the previous one.
 * @param claimed - The edges the replaced record stood for: its own references,
 * or the preserved baseline when that record could not read the file.
 * @param key - `sourceText ?? specifier` of the walked-back edge.
 * @returns Occurrences the record does not claim; zero or less opens nothing.
 */
export function unaccountedOccurrences(
  lines: readonly string[],
  accepted: FileFacts,
  claimed: FileFacts['references'],
  key: string,
): number {
  const present = locateReference(lines, referenceBehind(claimed, key)).length;
  const accountedFor = accepted.references.filter(
    (candidate) => (candidate.sourceText ?? candidate.specifier) === key,
  ).length;
  return present - accountedFor;
}

/**
 * The walked-back reference as the record before it spelled it.
 *
 * How the reference was spelled decides which lines count as occurrences, so a
 * key whose reference is gone is located as a bare specifier.
 *
 * @param claimed - The edges the replaced record stood for.
 * @param key - `sourceText ?? specifier` of the walked-back edge.
 * @returns That reference, or the key as a bare specifier when it is gone.
 */
function referenceBehind(
  claimed: FileFacts['references'],
  key: string,
): Pick<FileFacts['references'][number], 'specifier' | 'sourceText'> {
  return (
    claimed.find(
      (candidate) => (candidate.sourceText ?? candidate.specifier) === key,
    ) ?? { specifier: key }
  );
}
