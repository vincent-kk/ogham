import { lstatSync } from 'node:fs';

import { listDirectoryIfExistsSync, portableJoin } from '@ogham/cross-platform';

import {
  DIRECTIVE_BINDING_FILE,
  DIRECTIVE_LOCK_DIR,
} from '../../../constants/directives.js';

/** File metadata used to measure directive sets and check recent activity. */
interface DirectiveFile {
  /** Path relative to the root of the set. */
  name: string;
  /** Size in bytes on disk. */
  bytes: number;
  /** Content modification time in epoch milliseconds. */
  modifiedAt: number;
}

/**
 * Collect ordinary files under a validated directive directory.
 * @param directory Directory that has already passed the path checks.
 * @param prefix Relative prefix carried through recursion.
 * @returns File paths and metadata, excluding links and binding artifacts.
 */
export function listDirectiveFiles(
  directory: string,
  prefix = '',
): DirectiveFile[] {
  const files: DirectiveFile[] = [];
  for (const entry of listDirectoryIfExistsSync(directory)) {
    if (
      entry === DIRECTIVE_BINDING_FILE ||
      entry === DIRECTIVE_LOCK_DIR ||
      entry.startsWith(`${DIRECTIVE_LOCK_DIR}.`) ||
      entry.startsWith(`${DIRECTIVE_BINDING_FILE}.tmp-`) ||
      entry.endsWith('.tmp')
    )
      continue;
    const path = portableJoin(directory, `./${entry}`);
    const name = prefix + entry;
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (stat?.isDirectory())
      files.push(...listDirectiveFiles(path, `${name}/`));
    else if (stat?.isFile())
      files.push({ name, bytes: stat.size, modifiedAt: stat.mtimeMs });
  }
  return files;
}
