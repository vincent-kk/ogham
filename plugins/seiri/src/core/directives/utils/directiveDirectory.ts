import { lstatSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

import { CONFIG_DIR, DIRECTIVES_DIR } from '../../../constants/files.js';
import { TASK_NAME_PATTERN } from '../../../constants/gates.js';

/**
 * Resolve a directive directory only through regular, local path segments.
 * @param root Real checkout root.
 * @param set Optional kebab-case set name within the directive store.
 * @returns Existing directive directory, or undefined for invalid or missing paths.
 */
export function directiveDirectory(
  root: string,
  set?: string,
): string | undefined {
  if (set !== undefined && !TASK_NAME_PATTERN.test(set)) return undefined;
  let path = root;
  for (const segment of [
    CONFIG_DIR,
    DIRECTIVES_DIR,
    ...(set === undefined ? [] : [set]),
  ]) {
    path = portableJoin(path, segment);
    if (!lstatSync(path, { throwIfNoEntry: false })?.isDirectory())
      return undefined;
  }
  return path;
}
