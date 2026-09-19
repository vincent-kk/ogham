import { pathForCompare, portableJoin } from '@ogham/cross-platform';

import type { PlannedMove } from '../../../types/restructure.js';
import { isAtOrWithin } from '../imports/isAtOrWithin.js';

import { isPhysicallyWithin } from './isPhysicallyWithin.js';
import { listAncestorDirectories } from './listAncestorDirectories.js';
import { sortUniquePaths } from './sortUniquePaths.js';

/**
 * The paths whose state decided where the plan's moves land: each move's
 * target, whose prior occupation the plan assumed absent, and the `INTENT.md`
 * and `DETAIL.md` of every directory from the project root down to each source
 * and target, which decide classification and the lowest common fractal. A
 * probe may not exist; its absence is part of what the plan read. A probe whose
 * real location leaves the root through a symbolic link is left out, as the
 * snapshot does not follow such links either.
 * @param projectRoot - Absolute project root
 * @param moves - Executable moves of the plan
 * @param readPaths - The plan's read set; a probe already in it is left out
 * @returns Absolute paths inside the project root, sorted and without duplicates
 */
export function collectPlanProbePaths(
  projectRoot: string,
  moves: readonly PlannedMove[],
  readPaths: readonly string[],
): string[] {
  const read = new Set(readPaths.map(pathForCompare));
  const probes = moves.flatMap(({ sourcePath, targetPath }) => [
    targetPath,
    ...[sourcePath, targetPath]
      .flatMap((path) => listAncestorDirectories(projectRoot, path))
      .flatMap((directory) => [
        portableJoin(directory, 'INTENT.md'),
        portableJoin(directory, 'DETAIL.md'),
      ]),
  ]);
  return sortUniquePaths(
    probes.filter(
      (path) =>
        isAtOrWithin(projectRoot, path) &&
        !read.has(pathForCompare(path)) &&
        isPhysicallyWithin(projectRoot, path),
    ),
  );
}
