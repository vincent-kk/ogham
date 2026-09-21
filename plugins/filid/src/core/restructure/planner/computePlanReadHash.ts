import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';

import { portableResolve } from '@ogham/cross-platform';

import {
  computeSnapshotHash,
  resolveHashFile,
} from '../../projectSnapshot/index.js';

import { isMissingPathError } from './isMissingPathError.js';

/**
 * The state of one probe path: missing, a directory, or a file with its content digest.
 * @param path - Absolute probe path
 * @returns `missing`, `directory`, or `file:<sha256>`
 * @throws Any filesystem error other than a missing path
 */
function probeState(path: string): string {
  try {
    if (statSync(path).isDirectory()) return 'directory';
    return `file:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
  } catch (error) {
    if (isMissingPathError(error)) return 'missing';
    throw error;
  }
}

/**
 * Hash everything the plan read: the bytes of its read set and the state of its probe set.
 *
 * The plan and precondition both call this, so any change to a read file or a
 * probe's existence, kind or content yields a different hash.
 * @param projectRoot - Absolute project root every path lies within
 * @param readPaths - Files whose bytes are hashed; a missing one hashes as missing
 * @param probePaths - Paths whose state is hashed; a directory contributes its kind only
 * @returns Hex digest compared by precondition against the plan's `readHash`
 * @throws When a path lies outside the root or a probe fails for a reason other than absence
 */
export function computePlanReadHash(
  projectRoot: string,
  readPaths: readonly string[],
  probePaths: readonly string[],
): string {
  const root = portableResolve(projectRoot);
  return computeSnapshotHash(
    root,
    readPaths,
    probePaths.map((path) => {
      const probe = resolveHashFile(root, path);
      return {
        probe: probe.relativePath,
        state: probeState(probe.absolutePath),
      };
    }),
  );
}
