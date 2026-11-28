import {
  DIRECTIVE_INDEX_FILE,
  DIRECTIVE_OPTIONAL_DOCUMENTS,
} from '../../../../constants/directives.js';
import type { DirectiveViolation } from '../../../../types/directives.js';

import { readCodeSpans } from './readCodeSpans.js';

/**
 * Compare the files of a set with the paths the entry document names in inline code spans.
 * @param names Relative file names present in the set.
 * @param index Body of the entry document.
 * @returns An unlisted violation, in set order, for each file other than the entry document whose path equals no code span, then a missing violation, in order of first appearance, for each span that ends in `.md`, has no whitespace, is not in the set, is not a standard document a set creates on first need, and is local to the set. A path is local when it has no `/` or starts with a directory the set contains, so `.seiri/x.md`, `/abs/x.md`, `~/x.md` and `../x.md` are not checked.
 */
export function findIndexViolations(
  names: string[],
  index: string,
): DirectiveViolation[] {
  const spans = readCodeSpans(index);
  const references = new Set(spans);
  const unlisted = names
    .filter((name) => name !== DIRECTIVE_INDEX_FILE && !references.has(name))
    .map((file) => ({
      file,
      problem: 'unlisted' as const,
      detail: `not named in ${DIRECTIVE_INDEX_FILE}`,
    }));
  const missing = [...references]
    .filter(
      (reference) =>
        reference.endsWith('.md') &&
        !/\s/.test(reference) &&
        !names.includes(reference) &&
        !DIRECTIVE_OPTIONAL_DOCUMENTS.includes(reference) &&
        isSetLocal(reference, names),
    )
    .map((file) => ({
      file,
      problem: 'missing' as const,
      detail: `named in ${DIRECTIVE_INDEX_FILE}`,
    }));
  return [...unlisted, ...missing];
}

/** Whether a reference can name a file of the set: it has no directory part, or its first directory is one the set contains. */
function isSetLocal(reference: string, names: string[]): boolean {
  if (!reference.includes('/')) return true;
  const directory = reference.slice(0, reference.indexOf('/'));
  return names.some((name) => name.startsWith(`${directory}/`));
}
