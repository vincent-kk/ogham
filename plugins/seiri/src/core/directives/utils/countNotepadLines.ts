import { DIRECTIVE_LOG_FILES } from '../../../constants/directives.js';

import { directiveDirectory } from './directiveDirectory.js';
import { readLogLines } from './inspection/readLogLines.js';

/**
 * Count the nonblank lines of a set's notepad without reading any other file.
 * @param root Real checkout root.
 * @param set Kebab-case set name.
 * @returns The number of nonblank lines; 0 when the set or the notepad is absent or the notepad cannot be read.
 * @throws For read failures other than a missing file or denied access.
 */
export function countNotepadLines(root: string, set: string): number {
  const directory = directiveDirectory(root, set);
  return directory
    ? readLogLines(directory, DIRECTIVE_LOG_FILES.notepad).lines.length
    : 0;
}
