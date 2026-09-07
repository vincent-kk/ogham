import {
  REVIEW_CHANGE_CONTEXT_LIMIT,
  REVIEW_CHANGE_CONTEXT_LOG_LIMIT,
  REVIEW_CHANGE_CONTEXT_SECTIONS,
  REVIEW_STATE_DIAGNOSTIC_CODES,
} from '../../../../constants/reviewState.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import type { ReviewChangedFile } from '../state/reviewStateTypes.js';

import { buildHandoffSeed } from './buildHandoffSeed.js';
import { excerptChangeContextSections } from './excerptChangeContextSections.js';
import { mapEvidenceDiagnosticToHandoffFinding } from './mapEvidenceDiagnosticToHandoffFinding.js';
import { parseHandoffBlock } from './parseHandoffBlock.js';
import type { ReviewHandoffSeed } from './reviewHandoffSeedSchema.js';

/** CRLF and standalone CR line endings normalized for context rendering. */
const CARRIAGE_RETURN_NEWLINE_PATTERN = /\r\n?/g;

/** Control characters removed while preserving normalized newlines and tabs. */
const DISALLOWED_CONTROL_CHARACTER_PATTERN = /[^\P{Cc}\n\t]/gu;

/**
 * Read commit context or excerpt and sanitize caller text for untrusted artifact rendering.
 * @param input Absolute Git root, merge base, numstat roster, and optional text.
 * @returns Bounded context, handoff claims or an invalid-block seed, and nonfatal diagnostics.
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
  /** Sanitized untrusted excerpt bounded by the shared character limit. */
  changeContext: string;
  /** Validated claims or an invalid-block diagnostic seed, else null when absent. */
  handoff: ReviewHandoffSeed | null;
  /** Nonfatal diagnostics describing invalid handoff data, template mismatch, or truncation. */
  diagnostics: ToolDiagnostic[];
}> {
  let context = input.changeContext;
  let handoff: ReviewHandoffSeed | null = null;
  const diagnostics: ToolDiagnostic[] = [];
  if (context !== undefined) {
    const parsed = parseHandoffBlock(context);
    const excerpt = excerptChangeContextSections(
      parsed.remainder,
      REVIEW_CHANGE_CONTEXT_SECTIONS,
    );
    context = excerpt.excerpt;
    const invalidFindings = parsed.diagnostics
      .filter(
        (diagnostic) =>
          diagnostic.code === REVIEW_STATE_DIAGNOSTIC_CODES.HANDOFF_INVALID,
      )
      .map(mapEvidenceDiagnosticToHandoffFinding);
    handoff =
      parsed.handoff ??
      (invalidFindings.length > 0
        ? buildHandoffSeed({
            snapshotHash: null,
            scope: [],
            documentSync: 'failed',
            repaired: 0,
            findings: invalidFindings,
            outOfScopeRoot: [],
            callerEntries: [],
          }).seed
        : null);
    diagnostics.push(...parsed.diagnostics);
    if (!excerpt.matched)
      diagnostics.push({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.CHANGE_CONTEXT_UNTEMPLATED,
        message:
          'Change context did not match any configured template section.',
      });
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
    .replace(CARRIAGE_RETURN_NEWLINE_PATTERN, '\n')
    .replace(DISALLOWED_CONTROL_CHARACTER_PATTERN, '');
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
