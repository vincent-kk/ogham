import { isAbsolute, resolve } from 'node:path';

import { isInsideRoot } from '../paths/isInsideRoot.js';
import { toPosixRelative } from '../paths/toPosixRelative.js';

/** Options whose value is a path the program resolves against the working directory. */
const PATH_OPTIONS: ReadonlySet<string> = new Set([
  '--root',
  '--out',
  '--files-from',
]);

/**
 * The command recorded in provenance, free of machine-specific paths.
 *
 * An absolute argument, and the value of `--root`, `--out` or `--files-from`
 * other than `-`, becomes `.` for the project root, a relative path for a path
 * inside it, and `<outside>` for anything else, so the same tree yields the
 * same records on every machine, working directory and output directory. A
 * relative positional path is relative to the root already and stays as given.
 * @param argv Arguments after the script path.
 * @param projectRoot Absolute project root.
 * @param workingDirectory Absolute directory a relative option value is resolved against.
 * @returns `filid-facts` followed by the normalized arguments.
 */
export function normalizeCommand(
  argv: readonly string[],
  projectRoot: string,
  workingDirectory: string,
): string {
  let isOptionValue = false;
  const tokens = argv.map((argument) => {
    const isPathValue = isOptionValue && argument !== '-';
    isOptionValue = !isOptionValue && PATH_OPTIONS.has(argument);
    if (!isPathValue && !isAbsolute(argument)) return argument;
    const path = resolve(workingDirectory, argument);
    if (path === projectRoot) return '.';
    return isInsideRoot(projectRoot, path)
      ? toPosixRelative(projectRoot, path)
      : '<outside>';
  });
  return ['filid-facts', ...tokens].join(' ');
}
