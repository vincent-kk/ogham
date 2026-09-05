import {
  REVIEW_CHANGE_CONTEXT_LIMIT,
  REVIEW_CHANGE_CONTEXT_LOG_LIMIT,
  REVIEW_STATE_DIAGNOSTIC_CODES,
} from '../../../../constants/reviewState.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import type { ReviewChangedFile } from '../state/reviewStateTypes.js';

/**
 * Read commit context or sanitize caller text for untrusted artifact rendering.
 * @param input Absolute Git root, merge base, numstat roster, and optional text.
 * @returns Bounded context and a warning if the sanitized text was truncated.
 * @throws When Git cannot supply the requested committed change context.
 */
export async function readChangeContext(input: {
  /** Canonical Git root bounding the optional commit-log read. */
  projectRoot: string;
  /** Resolved merge-base commit starting the committed context range. */
  baseCommit: string;
  /** Changed-file roster supplying the numstat totals. */
  files: readonly ReviewChangedFile[];
  /** Caller text to sanitize instead of deriving context from Git. */
  changeContext?: string;
}): Promise<{
  /** Sanitized untrusted context bounded by the shared character limit. */
  changeContext: string;
  /** Nonfatal diagnostics describing any context truncation. */
  diagnostics: ToolDiagnostic[];
}> {
  let context = input.changeContext;
  if (context === undefined) {
    const log = await executeReviewGit(input.projectRoot, [
      'log',
      '--no-merges',
      '--format=%h%x09%s',
      `--max-count=${REVIEW_CHANGE_CONTEXT_LOG_LIMIT}`,
      `${input.baseCommit}..HEAD`,
    ]);
    const totals = input.files.reduce(
      (sum, file) => ({
        insertions: sum.insertions + file.insertions,
        deletions: sum.deletions + file.deletions,
      }),
      { insertions: 0, deletions: 0 },
    );
    context = `${log.trimEnd().split('\n').slice(0, REVIEW_CHANGE_CONTEXT_LOG_LIMIT).join('\n')}\n${input.files.length} files changed, ${totals.insertions} insertions(+), ${totals.deletions} deletions(-)`;
  }
  const sanitized = context
    .replace(/\r\n?/g, '\n')
    .replace(/[^\P{Cc}\n\t]/gu, '');
  return {
    changeContext: sanitized.slice(0, REVIEW_CHANGE_CONTEXT_LIMIT),
    diagnostics:
      sanitized.length > REVIEW_CHANGE_CONTEXT_LIMIT
        ? [
            {
              code: REVIEW_STATE_DIAGNOSTIC_CODES.CHANGE_CONTEXT_TRUNCATED,
              message: `Change context was truncated to ${REVIEW_CHANGE_CONTEXT_LIMIT} characters.`,
            },
          ]
        : [],
  };
}
