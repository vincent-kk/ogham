import { DIRECTIVE_LOG_FILES } from '../../../constants/directives.js';

import { directiveDirectory } from './directiveDirectory.js';
import { readLogLines } from './inspection/readLogLines.js';
import { listDirectiveFiles } from './listDirectiveFiles.js';

/**
 * Count the nonblank lines of a set's notepad without reading any other file.
 * @param root Real checkout root.
 * @param set Kebab-case set name.
 * @returns The number of nonblank lines; 0 when the set is absent, the notepad is not a regular file of the set, or the notepad cannot be read.
 */
export function countNotepadLines(root: string, set: string): number {
  const directory = directiveDirectory(root, set);
  if (!directory) return 0;
  const notepad = DIRECTIVE_LOG_FILES.notepad;
  if (!listDirectiveFiles(directory).some(({ name }) => name === notepad))
    return 0;
  try {
    return readLogLines(directory, notepad).lines.length;
  } catch {
    return 0;
  }
}
