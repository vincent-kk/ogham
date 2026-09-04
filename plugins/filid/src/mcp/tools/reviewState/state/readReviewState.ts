import { readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import {
  REVIEW_STATE_ERROR_MESSAGES,
  REVIEW_STATE_SCHEMA_VERSION,
} from '../../../../constants/reviewState.js';

import { ReviewStateRecordSchema } from './reviewStateRecordSchema.js';
import type { ReviewStateRecord } from './reviewStateTypes.js';

/** Marker returned when a persisted state belongs to another schema version. */
interface ReviewStateSchemaMismatch {
  /** Stable discriminator used by lifecycle handlers. */
  kind: 'schema-mismatch';
}

/**
 * Read and deeply validate one canonical review-state record.
 * @param statePath Absolute path to the branch state file.
 * @returns The v2 state, a mismatch marker for obsolete or invalid JSON, or null.
 */
export function readReviewState(
  statePath: string,
): ReviewStateRecord | ReviewStateSchemaMismatch | null {
  const content = readUtf8FileIfExistsSync(statePath);
  if (content === null) return null;

  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return { kind: 'schema-mismatch' };
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (value as Record<string, unknown>).schemaVersion !==
      REVIEW_STATE_SCHEMA_VERSION
  )
    return { kind: 'schema-mismatch' };

  const parsed = ReviewStateRecordSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      `${REVIEW_STATE_ERROR_MESSAGES.STATE_INVALID}: ${statePath}`,
    );

  return parsed.data;
}
