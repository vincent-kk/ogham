import { portableJoin, withFileLockSync } from '@ogham/cross-platform';

import { DIRECTIVE_LOG_FILES } from '../../../constants/directives.js';
import type { DirectiveLog } from '../../../types/directives.js';

import { writeLogLine } from './appending/writeLogLine.js';
import { directiveDirectory } from './directiveDirectory.js';
import { listDirectiveFiles } from './listDirectiveFiles.js';

/**
 * Append one JSON line to a set's notepad or history without following links.
 * @param root Real checkout root.
 * @param set Existing path-safe set name.
 * @param log Record to extend.
 * @param text Entry content; stored as a JSON string, so line breaks stay on one line.
 * @param now Clock value in epoch milliseconds, stamped as an ISO 8601 UTC time.
 * @returns Whether the line was written. False when the set is missing or has no directive files, its lock is held, or the target is a link or not a regular file.
 * @throws RangeError when `now` is not a finite number.
 */
export function appendDirectiveLog(
  root: string,
  set: string,
  log: DirectiveLog,
  text: string,
  now: number,
): boolean {
  if (!Number.isFinite(now)) throw new RangeError('now must be finite');
  const directory = directiveDirectory(root, set);
  if (!directory) return false;
  const line = `${JSON.stringify({ at: new Date(now).toISOString(), text })}\n`;
  // The shared helper appends .lock to the target name, matching binding updates.
  const result = withFileLockSync(
    portableJoin(directory, 'binding'),
    () =>
      listDirectiveFiles(directory).length > 0 &&
      writeLogLine(portableJoin(directory, DIRECTIVE_LOG_FILES[log]), line),
    { timeoutMs: 500, staleMs: 5_000 },
  );
  return result.acquired && result.value;
}
