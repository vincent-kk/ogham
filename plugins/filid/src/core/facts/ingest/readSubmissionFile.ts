import {
  canonicalizeTargetPathSync,
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
} from '@ogham/cross-platform';

import { FACTS_SUBMISSION_MAX_BYTES } from '../../../constants/facts.js';
import { readGuardedFileSync } from '../paths/readGuardedFileSync.js';

/** Why filid would not take a submission file, or the entries it held. */
export type SubmissionFileRead =
  | { ok: true; entries: unknown[] }
  | {
      ok: false;
      reason:
        | 'not-absolute'
        | 'inside-project'
        | 'symlink'
        | 'not-regular'
        | 'too-large'
        | 'unreadable'
        | 'not-json';
    };

/**
 * Open an extraction output the agent wrote, and hand back its top-level entries.
 *
 * The MCP server runs outside the agent's sandbox, so this is the one place a
 * caller-chosen path is opened.
 *
 * Both the path and the project root are canonicalized before anything is
 * compared or opened, and every later step uses the canonical path. That is
 * what lets an agent pass the path it naturally has — on macOS a `$TMPDIR` path
 * reaches it through `/tmp` or `/var`, both symbolic links — while still
 * refusing a link that lands inside the project: containment is judged on where
 * the path really leads, not on how it is spelled. An untracked file inside the
 * tree would join the scanned path list and move the epoch it is being
 * submitted against (spec §2.2).
 *
 * Nothing derived from the file's contents leaves through this result. A parse
 * failure reports only that the bytes were not JSON: the platform parser's own
 * message quotes the offending source, which would turn this call into a read
 * oracle for any file on the host. A path the host rejects outright — an
 * embedded NUL byte is the reachable case — is `unreadable`, not an
 * unclassified crash.
 *
 * @param projectRoot - Absolute project root the file must resolve outside of.
 * @param filePath - Absolute path the caller supplied.
 * @returns The JSON array's elements, still unvalidated, or the refusal reason.
 */
export function readSubmissionFile(
  projectRoot: string,
  filePath: string,
): SubmissionFileRead {
  if (!portableIsAbsolute(filePath))
    return { ok: false, reason: 'not-absolute' };
  let canonicalFile: string;
  let canonicalRoot: string;
  try {
    canonicalFile = canonicalizeTargetPathSync(projectRoot, filePath);
    canonicalRoot = canonicalizeTargetPathSync(projectRoot, projectRoot);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }
  if (isWithin(canonicalRoot, canonicalFile))
    return { ok: false, reason: 'inside-project' };
  const read = readGuardedFileSync(canonicalFile, FACTS_SUBMISSION_MAX_BYTES);
  if (!read.ok) return { ok: false, reason: read.reason };
  const entries = parseEntries(read.bytes);
  return entries === null
    ? { ok: false, reason: 'not-json' }
    : { ok: true, entries };
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

/**
 * Parse submission bytes into a top-level array, discarding the parser message.
 * @param bytes Raw file contents.
 * @returns The array's elements, or null when the bytes are not a JSON array.
 */
function parseEntries(bytes: Buffer): unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(bytes.toString('utf8'));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
