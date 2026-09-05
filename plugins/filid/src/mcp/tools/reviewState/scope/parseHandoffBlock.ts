import {
  REVIEW_HANDOFF_MARKER,
  REVIEW_STATE_DIAGNOSTIC_CODES,
} from '../../../../constants/reviewState.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import { renderSchemaIssue } from '../opinion/utils/renderSchemaIssue.js';

import {
  REVIEW_HANDOFF_SEED_SCHEMA,
  type ReviewHandoffSeed,
} from './reviewHandoffSeedSchema.js';

/** First complete handoff comment after caller newlines have been normalized. */
const REVIEW_HANDOFF_BLOCK_PATTERN = new RegExp(
  String.raw`<!--[ \t]*${REVIEW_HANDOFF_MARKER}[ \t]*\n([\s\S]*?)\n-->`,
  'u',
);

/**
 * Describe one malformed handoff without promoting it to a review finding.
 * @param message JSON parser detail or the first rendered schema issue.
 * @returns Nonfatal diagnostic preserving the untrusted block as caller text.
 */
function invalidDiagnostic(message: string): ToolDiagnostic {
  return { code: REVIEW_STATE_DIAGNOSTIC_CODES.HANDOFF_INVALID, message };
}

/**
 * Extract the first valid handoff block before caller text is sanitized or capped.
 * @param changeContext Untrusted caller text with LF, CRLF, or CR newlines.
 * @returns Validated claims and remaining normalized text, or one diagnostic on failure.
 */
export function parseHandoffBlock(changeContext: string): {
  /** Validated claims, or null when the first block is absent or invalid. */
  handoff: ReviewHandoffSeed | null;
  /** Normalized text with only a successfully validated first block removed. */
  remainder: string;
  /** At most one JSON or schema diagnostic for the first matching block. */
  diagnostics: ToolDiagnostic[];
} {
  const remainder = changeContext.replace(/\r\n?/g, '\n');
  const match = REVIEW_HANDOFF_BLOCK_PATTERN.exec(remainder);
  if (!match) return { handoff: null, remainder, diagnostics: [] };

  let value: unknown;
  try {
    value = JSON.parse(match[1]) as unknown;
  } catch (error) {
    return {
      handoff: null,
      remainder,
      diagnostics: [
        invalidDiagnostic(
          error instanceof Error ? error.message : 'Invalid JSON.',
        ),
      ],
    };
  }
  const parsed = REVIEW_HANDOFF_SEED_SCHEMA.safeParse(value);
  if (!parsed.success)
    return {
      handoff: null,
      remainder,
      diagnostics: [
        invalidDiagnostic(renderSchemaIssue(parsed.error.issues[0])),
      ],
    };
  return {
    handoff: parsed.data,
    remainder:
      remainder.slice(0, match.index) +
      remainder.slice(match.index + match[0].length),
    diagnostics: [],
  };
}
