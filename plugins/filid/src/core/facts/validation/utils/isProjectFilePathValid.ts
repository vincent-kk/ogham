import { lstatSync, readdirSync } from 'node:fs';
import { dirname, basename } from 'node:path';

import {
  assertNoSymlinkDescendantsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

/**
 * Whether a project-relative path names a real, reachable file inside the project.
 *
 * The three checks are spec §4.3 (i)(ii)(iii). (i) containment and no symbolic
 * link on the way down, so a record cannot make filid follow a link out of the
 * tree. (ii) the basename must appear in the parent directory's own listing
 * byte for byte, which is what catches a case-only spelling that a
 * case-insensitive filesystem would otherwise accept and a case-sensitive one
 * would not. (iii) a directory is not a file a reference can resolve to.
 *
 * @param projectRoot - Absolute project root every path must stay inside.
 * @param relativePath - POSIX path relative to the project root.
 * @returns True only when all three checks pass; any failure, including an
 * unreadable parent, is false.
 */
export function isProjectFilePathValid(
  projectRoot: string,
  relativePath: string,
): boolean {
  let absolute: string;
  try {
    absolute = resolveContainedPath(projectRoot, relativePath);
    assertNoSymlinkDescendantsSync(projectRoot, absolute);
  } catch {
    return false;
  }
  try {
    if (!readdirSync(dirname(absolute)).includes(basename(absolute)))
      return false;
    return lstatSync(absolute).isFile();
  } catch {
    return false;
  }
}
