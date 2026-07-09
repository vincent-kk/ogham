/**
 * @file isAutoCommitSubject.ts
 * @description Classify a commit subject as an auto commit — built-in markers or custom prefix.
 */
import { AUTO_COMMIT_SUBJECT_MARKERS } from '../../../../../../constants/vaultCommitter.js';

/**
 * A subject is an auto commit when it carries one of the built-in markers
 * (legacy formats included) or starts with the custom template's static
 * prefix. Blank prefixes are ignored — they would match every commit.
 */
export function isAutoCommitSubject(
  subject: string,
  customPrefix?: string,
): boolean {
  if (AUTO_COMMIT_SUBJECT_MARKERS.some((marker) => subject.includes(marker)))
    return true;
  return customPrefix !== undefined && customPrefix.trim().length > 0
    ? subject.startsWith(customPrefix)
    : false;
}
