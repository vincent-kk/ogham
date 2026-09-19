import { createHash } from 'node:crypto';

import {
  canonicalizeTargetPathSync,
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
  resolveContainedPath,
} from '@ogham/cross-platform';

import {
  FACTS_HASH_PREFIX,
  FACTS_SOURCE_FILE_MAX_BYTES,
} from '../../../../constants/facts.js';
import { readGuardedFileSync } from '../../paths/readGuardedFileSync.js';

/** A project file's current bytes, or why filid would not read them. */
export type ProjectFileDigest =
  | { ok: true; contentHash: string; contents: Buffer }
  | { ok: false; reason: 'unreadable' };

/**
 * Read one project file and digest its bytes.
 *
 * This is the only way filid reads a source file: as bytes, for hashing and
 * literal string search, never parsed (P1). It goes through the same guarded
 * read as every other caller-influenced path — canonicalize, then open with
 * `O_NOFOLLOW | O_NONBLOCK` and judge type and size on the descriptor. The path
 * arrives from an agent-submitted record, so a plain `readFileSync` here would
 * be the one place an agent-named path reached the filesystem unguarded: a FIFO
 * swapped in at that path would hang the server, and a symbolic link would be
 * followed wherever it led.
 *
 * Containment is required and checked on the canonical location, because unlike
 * a resolution input a project file must be inside the project; a link planted
 * in the tree cannot make filid hash something outside it.
 *
 * @param projectRoot - Absolute project root the path must stay inside.
 * @param relativePath - POSIX path relative to the project root.
 * @returns The digest and the bytes, or `unreadable` when the path escapes the
 * project, is not a regular file, exceeds the source cap, or cannot be read —
 * all of which mean no record can bind to it.
 */
export function hashProjectFile(
  projectRoot: string,
  relativePath: string,
): ProjectFileDigest {
  let canonical: string;
  let canonicalRoot: string;
  try {
    canonical = canonicalizeTargetPathSync(
      projectRoot,
      resolveContainedPath(projectRoot, relativePath),
    );
    canonicalRoot = canonicalizeTargetPathSync(projectRoot, projectRoot);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (!isWithin(canonicalRoot, canonical))
    return { ok: false, reason: 'unreadable' };
  const read = readGuardedFileSync(canonical, FACTS_SOURCE_FILE_MAX_BYTES);
  if (!read.ok) return { ok: false, reason: 'unreadable' };
  return {
    ok: true,
    contentHash: `${FACTS_HASH_PREFIX}${createHash('sha256').update(read.bytes).digest('hex')}`,
    contents: read.bytes,
  };
}

/**
 * Whether one canonical path sits at or under another.
 * @param root Canonical project root.
 * @param candidate Canonical path to place.
 * @returns True when the candidate does not climb out of the root.
 */
function isWithin(root: string, candidate: string): boolean {
  const relative = pathForCompare(portableRelative(root, candidate));
  return (
    !portableIsAbsolute(relative) &&
    relative !== '..' &&
    !relative.startsWith('../')
  );
}
