import { lstatSync } from 'node:fs';

import { listDirectoryIfExistsSync, portableJoin } from '@ogham/cross-platform';

import { TASK_NAME_PATTERN } from '../../../constants/gates.js';

import { directiveDirectory } from './directiveDirectory.js';

/**
 * Enumerate path-safe directories in the local directive store.
 * @param root Real checkout root.
 * @returns Set names only, without following symbolic links.
 */
export function listDirectiveSets(root: string): string[] {
  const directory = directiveDirectory(root);
  return directory
    ? listDirectoryIfExistsSync(directory).filter(
        (entry) =>
          TASK_NAME_PATTERN.test(entry) &&
          lstatSync(portableJoin(directory, entry), {
            throwIfNoEntry: false,
          })?.isDirectory(),
      )
    : [];
}
