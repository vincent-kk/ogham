import {
  RENAME_STATUS_CODES,
  REVIEW_STATE_GIT,
} from '../../../../constants/reviewState.js';

/** Characters git spends on the two status codes and the following space. */
const STATUS_PREFIX_LENGTH = 3;

/**
 * Read the changed paths out of NUL-delimited `git status --porcelain -z`.
 *
 * A rename or copy record is followed by its source path in its own record;
 * that source is not a separate change, so it is skipped rather than
 * classified twice.
 * @param porcelainOutput Raw stdout from the status call.
 * @returns Repository-relative paths, in the order git reported them.
 */
export function parseGitStatusPaths(porcelainOutput: string): string[] {
  const records = porcelainOutput
    .split(REVIEW_STATE_GIT.RECORD_SEPARATOR)
    .filter((record) => record.length > 0);
  const paths: string[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const statusCode = record.slice(0, STATUS_PREFIX_LENGTH);
    paths.push(record.slice(STATUS_PREFIX_LENGTH));
    if (RENAME_STATUS_CODES.some((code) => statusCode.includes(code)))
      index += 1;
  }
  return paths;
}
