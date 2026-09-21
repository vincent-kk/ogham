import { lstatSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import type { RejectionReason } from '../../types/fileFacts.js';

import { isInsideRoot } from './isInsideRoot.js';
import { toPosixRelative } from './toPosixRelative.js';

/** A requested path accepted for extraction. */
export interface ProjectFile {
  /** Absolute path under the root, spelled with the names on disk. */
  absolutePath: string;
  /** Project-relative POSIX path, spelled with the names on disk. */
  path: string;
}

/**
 * Whether a path below the root passes through a symbolic link.
 * @param projectRoot Absolute project root.
 * @param absolutePath Existing path at or below the root.
 * @returns True when the path itself or a directory on the way is a link.
 */
function passesThroughLink(projectRoot: string, absolutePath: string): boolean {
  let current = projectRoot;
  for (const segment of relative(projectRoot, absolutePath).split(sep)) {
    current = join(current, segment);
    if (lstatSync(current).isSymbolicLink()) return true;
  }
  return false;
}

/**
 * Accept a requested path only when it is a file inside the project root.
 *
 * The path must stay inside both as a string and with every symbolic link
 * followed, so a link that leads out of the root is never read. A path that
 * passes through a link inside the root is refused as `symlink`, as the
 * server's scan skips links, and an accepted path is spelled as on disk, so
 * one physical file has one record however it was requested.
 * @param projectRoot Absolute project root.
 * @param realRoot `projectRoot` with its links followed.
 * @param requested Path as the caller gave it, relative to the root or absolute.
 * @returns The accepted file, or why it was refused.
 */
export function resolveProjectFile(
  projectRoot: string,
  realRoot: string,
  requested: string,
): ProjectFile | { reason: RejectionReason } {
  const absolutePath = resolve(projectRoot, requested);
  if (!isInsideRoot(projectRoot, absolutePath))
    return { reason: 'outside-project' };
  let realPath: string;
  try {
    realPath = realpathSync.native(absolutePath);
  } catch {
    return { reason: 'missing' };
  }
  if (!isInsideRoot(realRoot, realPath)) return { reason: 'outside-project' };
  if (passesThroughLink(projectRoot, absolutePath))
    return { reason: 'symlink' };
  if (!statSync(realPath).isFile()) return { reason: 'not-a-file' };
  const path = toPosixRelative(realRoot, realPath);
  return { absolutePath: resolve(projectRoot, path), path };
}
