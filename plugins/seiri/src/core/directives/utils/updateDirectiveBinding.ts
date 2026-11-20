import {
  portableJoin,
  removeFileIfExistsSync,
  withFileLockSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { DIRECTIVE_BINDING_FILE } from '../../../constants/directives.js';
import type { DirectiveBinding } from '../../../types/directives.js';

import { directiveDirectory } from './directiveDirectory.js';
import { readDirectiveBinding } from './readDirectiveBinding.js';

/**
 * Apply a binding change against the latest record while holding its lock.
 * @param root Real checkout root.
 * @param set Existing path-safe set name.
 * @param update Receives the current record and returns its replacement, the same record for no change, or undefined to remove it.
 * @returns Whether the mutation ran under the lock.
 */
export function updateDirectiveBinding(
  root: string,
  set: string,
  update: (current?: DirectiveBinding) => DirectiveBinding | undefined,
): boolean {
  const directory = directiveDirectory(root, set);
  if (!directory) return false;
  const path = portableJoin(directory, DIRECTIVE_BINDING_FILE);
  // The shared helper appends .lock to the target name.
  return withFileLockSync(
    portableJoin(directory, 'binding'),
    () => {
      const current = readDirectiveBinding(path);
      const next = update(current);
      if (next === undefined) removeFileIfExistsSync(path);
      else if (next !== current)
        writeFileAtomicallySync(path, JSON.stringify(next));
    },
    { timeoutMs: 500, staleMs: 5_000 },
  ).acquired;
}
