import { createHash } from 'node:crypto';

import { portableBasename } from '@ogham/cross-platform';

import { DEPENDENCY_DIAGNOSTIC_CODES } from '../../../../constants/dependencyDiagnosticCodes.js';
import { toProjectRelativePath } from '../../../../lib/toProjectRelativePath.js';
import type { SnapshotDiagnostic } from '../../../../types/fractal.js';

/**
 * Build the diagnostic for a symbolic link source discovery did not follow.
 *
 * Whatever the link holds lies outside the project root, so a consumer behind
 * it is missing from the dependency graph; the link is not followed, since the
 * analysis never reads outside the root.
 * @param projectRoot Root the link path is made relative to.
 * @param linkPath Absolute path of the link.
 * @returns A diagnostic scoped to dependency and boundary analysis, with a
 *   cause identity of the code and the project-relative link path.
 */
export function createUnfollowedLinkDiagnostic(
  projectRoot: string,
  linkPath: string,
): SnapshotDiagnostic {
  const relativePath = toProjectRelativePath(projectRoot, linkPath);
  return {
    code: DEPENDENCY_DIAGNOSTIC_CODES.SYMLINK_NOT_FOLLOWED,
    message: `${relativePath} is a symbolic link to a location outside the project root; filid does not follow it, so any import it holds is missing from the dependency graph.`,
    nextAction: `Add "${portableBasename(linkPath)}" to structure.additionalExcludedDirectories in .filid/config.json if the link holds no project source; the link then leaves the analysis. Otherwise, with the user's consent, replace ${relativePath} with the real file or directory, or move it out of the project. Then run again; until then, report dependency and boundary results that could involve it as indeterminate.`,
    path: linkPath,
    affects: ['dependencies', 'boundaries'],
    causeId: createHash('sha256')
      .update(
        JSON.stringify([
          DEPENDENCY_DIAGNOSTIC_CODES.SYMLINK_NOT_FOLLOWED,
          relativePath,
        ]),
      )
      .digest('hex'),
  };
}
