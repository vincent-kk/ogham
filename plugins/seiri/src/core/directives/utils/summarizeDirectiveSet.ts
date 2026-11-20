import type { DirectiveSetSummary } from '../../../types/directives.js';

import { directiveDirectory } from './directiveDirectory.js';
import { listDirectiveFiles } from './listDirectiveFiles.js';

/**
 * Summarize the deliverable files in one local directive set.
 * @param root Real checkout root.
 * @param set Kebab-case name of the directory to inspect.
 * @returns Sorted file paths and total byte count, or undefined for a missing set.
 */
export function summarizeDirectiveSet(
  root: string,
  set: string,
): DirectiveSetSummary | undefined {
  const directory = directiveDirectory(root, set);
  if (!directory) return undefined;
  const files = listDirectiveFiles(directory);
  return {
    set,
    files: files.map(({ name }) => name).sort(),
    bytes: files.reduce((total, file) => total + file.bytes, 0),
  };
}
