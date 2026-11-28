import {
  DIRECTIVE_INDEX_FILE,
  DIRECTIVE_OPTIONAL_DOCUMENTS,
} from '../../../../constants/directives.js';
import type { DirectiveViolation } from '../../../../types/directives.js';

/**
 * Compare the files of a set with the names its entry document mentions.
 * @param names Relative file names present in the set.
 * @param index Body of the entry document.
 * @returns An unlisted violation for each file the body never names as a whole file name, then a missing violation for each markdown file named in a code span that is absent, except the standard documents a set creates on first need. A span that starts with `.`, `/` or `~` points outside the set and is not checked.
 */
export function findIndexViolations(
  names: string[],
  index: string,
): DirectiveViolation[] {
  const unlisted = names
    .filter((name) => name !== DIRECTIVE_INDEX_FILE && !namesFile(index, name))
    .map((file) => ({
      file,
      problem: 'unlisted' as const,
      detail: `not named in ${DIRECTIVE_INDEX_FILE}`,
    }));
  const spans = [...index.matchAll(/`([^`\n./~][^`\n]*\.md)`/g)].map(
    ([, name]) => name,
  );
  const missing = [...new Set(spans)]
    .filter(
      (name) =>
        !names.includes(name) && !DIRECTIVE_OPTIONAL_DOCUMENTS.includes(name),
    )
    .map((file) => ({
      file,
      problem: 'missing' as const,
      detail: `named in ${DIRECTIVE_INDEX_FILE}`,
    }));
  return [...unlisted, ...missing];
}

/** Whether the text names the file itself, not a longer name or path that contains it; a period that ends a sentence is not part of a name. */
function namesFile(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const part = '[\\p{L}\\p{N}\\p{M}_';
  return new RegExp(
    `(?<!${part}./-])${escaped}(?!${part}/-]|\\.${part}])`,
    'u',
  ).test(text);
}
