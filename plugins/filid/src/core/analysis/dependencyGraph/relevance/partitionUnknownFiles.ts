import { pathForCompare } from '@ogham/cross-platform';

import { DEPENDENCY_DIAGNOSTIC_CODES } from '../../../../constants/dependencyDiagnosticCodes.js';
import type {
  UnknownFile,
  UnknownFilePartition,
} from '../../../../types/fractal.js';

import { collectTargetNames } from './collectTargetNames.js';
import { containsPathToken } from './containsPathToken.js';
import { relatedSubtree } from './relatedSubtree.js';
import type { RelevanceTarget } from './relevanceTarget.js';

/**
 * Whether a project-relative path is a target or lies inside one.
 * @param path Candidate path.
 * @param target Target path; `.` or empty is the project root, which holds every path.
 * @returns True at or below the target.
 */
function isAtOrBelow(path: string, target: string): boolean {
  const candidate = pathForCompare(path);
  const container = pathForCompare(target);
  if (container === '.' || container === '') return true;
  return candidate === container || candidate.startsWith(`${container}/`);
}

/**
 * Whether a file's text spells one of the names as a path token.
 * @param text File text, or null when it could not be read.
 * @param names Target names.
 * @returns True when the text is unreadable or holds a name token.
 */
function spellsTargetName(
  text: string | null,
  names: readonly string[],
): boolean {
  return text === null || names.some((name) => containsPathToken(text, name));
}

/**
 * Split unknown files into those related to the targets and the rest.
 *
 * A file is related when it lies in a target's related subtree, is one of
 * `extraRelevantPaths`, was not followed (a symbolic link, whose content is
 * never read), cannot be read, or spells a target name as a path token. This is
 * a filter, not a proof: a reference that does not spell the name — an alias
 * under another name, a star re-export — slips through, and conclusions that
 * hang on that file's outgoing references are judged on the known edges only.
 * @param unknownFiles Files the dependency graph could not confirm.
 * @param targets Units whose related files are wanted, project-relative.
 * @param readText Text of a project-relative file, or null when it cannot be read;
 *   called only for a file no other rule has already made relevant.
 * @param extraRelevantPaths Project-relative paths related whatever their text.
 * @returns Both groups in input order.
 */
export function partitionUnknownFiles(
  unknownFiles: readonly UnknownFile[],
  targets: readonly RelevanceTarget[],
  readText: (path: string) => string | null,
  extraRelevantPaths: readonly string[] = [],
): UnknownFilePartition {
  const names = collectTargetNames(targets);
  const extras = new Set(extraRelevantPaths.map(pathForCompare));
  const partition: UnknownFilePartition = { relevant: [], other: [] };
  for (const file of unknownFiles) {
    const isRelevant =
      targets.some((target) =>
        isAtOrBelow(file.path, relatedSubtree(target)),
      ) ||
      extras.has(pathForCompare(file.path)) ||
      file.causes.includes(DEPENDENCY_DIAGNOSTIC_CODES.SYMLINK_NOT_FOLLOWED) ||
      spellsTargetName(readText(file.path), names);
    (isRelevant ? partition.relevant : partition.other).push(file);
  }
  return partition;
}
