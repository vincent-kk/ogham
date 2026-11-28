import { DIRECTIVE_INDEX_FILE } from '../../../constants/directives.js';
import type { DirectiveInspection } from '../../../types/directives.js';

import { countNotepadLines } from './countNotepadLines.js';
import { directiveDirectory } from './directiveDirectory.js';
import { findIndexViolations } from './inspection/findIndexViolations.js';
import { findInvalidLogLines } from './inspection/findInvalidLogLines.js';
import { findLimitViolations } from './inspection/findLimitViolations.js';
import { readSetFile } from './inspection/readSetFile.js';
import { listDirectiveFiles } from './listDirectiveFiles.js';

/**
 * Check a directive set against the structured-set contract.
 * @param root Real checkout root.
 * @param set Kebab-case name of the set to inspect.
 * @returns The inspection, or undefined for a missing set. A set without an entry document is unstructured and reports no violations; a file refused to the reader is an unreadable violation, and an unreadable entry document adds its unreadable violation to the size violations and skips the checks that need its text.
 * @throws For read failures other than a missing file or denied access.
 */
export function inspectDirectiveSet(
  root: string,
  set: string,
): DirectiveInspection | undefined {
  const directory = directiveDirectory(root, set);
  if (!directory) return undefined;
  const files = listDirectiveFiles(directory);
  const names = files.map(({ name }) => name);
  const notepadLines = countNotepadLines(root, set);
  const limits = findLimitViolations(files);
  const entry = names.includes(DIRECTIVE_INDEX_FILE)
    ? readSetFile(directory, DIRECTIVE_INDEX_FILE)
    : { body: null };
  if ('error' in entry && entry.error !== undefined)
    return {
      structured: true,
      violations: [
        ...limits,
        {
          file: DIRECTIVE_INDEX_FILE,
          problem: 'unreadable',
          detail: entry.error,
        },
      ],
      notepadLines,
    };
  if (entry.body === null)
    return { structured: false, violations: [], notepadLines };
  return {
    structured: true,
    violations: [
      ...limits,
      ...findIndexViolations(names, entry.body),
      ...findInvalidLogLines(directory, names),
    ],
    notepadLines,
  };
}
