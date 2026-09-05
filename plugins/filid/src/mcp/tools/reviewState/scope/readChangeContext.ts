import {
  REVIEW_CHANGE_CONTEXT_LIMIT,
  REVIEW_CHANGE_CONTEXT_LOG_LIMIT,
  REVIEW_STATE_DIAGNOSTIC_CODES,
} from '../../../../constants/reviewState.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import type { ReviewChangedFile } from '../state/reviewStateTypes.js';

import { parseHandoffBlock } from './parseHandoffBlock.js';
import type { ReviewHandoffSeed } from './reviewHandoffSeedSchema.js';

/**
 * Read commit context or sanitize caller text for untrusted artifact rendering.
 * @param input Absolute Git root, merge base, numstat roster, and optional text.
 * @returns Bounded context, validated handoff claims, and nonfatal parsing or truncation diagnostics.
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
  /** Validated caller claims extracted before context truncation, or null for Git context. */
  handoff: ReviewHandoffSeed | null;
  /** Nonfatal diagnostics describing invalid handoff data or context truncation. */
  diagnostics: ToolDiagnostic[];
}> {
  let context = input.changeContext;
  let handoff: ReviewHandoffSeed | null = null;
  const diagnostics: ToolDiagnostic[] = [];
  if (context !== undefined) {
    const parsed = parseHandoffBlock(context);
    context = parsed.remainder;
    handoff = parsed.handoff;
    diagnostics.push(...parsed.diagnostics);
  } else {
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
  if (sanitized.length > REVIEW_CHANGE_CONTEXT_LIMIT)
    diagnostics.push({
      code: REVIEW_STATE_DIAGNOSTIC_CODES.CHANGE_CONTEXT_TRUNCATED,
      message: `Change context was truncated to ${REVIEW_CHANGE_CONTEXT_LIMIT} characters.`,
    });
  return {
    changeContext: sanitized.slice(0, REVIEW_CHANGE_CONTEXT_LIMIT),
    handoff,
    diagnostics,
  };
}
