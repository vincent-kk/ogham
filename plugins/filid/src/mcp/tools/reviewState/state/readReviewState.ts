import { readUtf8FileIfExistsSync } from '@ogham/cross-platform/filesystem';

import {
  REVIEW_STATE_ERROR_MESSAGES,
  REVIEW_STATE_PHASE_VALUES,
  REVIEW_STATE_REQUIRED_STRING_FIELDS,
  REVIEW_STATE_SCHEMA_VERSION,
} from '../../../../constants/reviewState.js';

import type { ReviewStateRecord } from './reviewStateTypes.js';

export function readReviewState(statePath: string): ReviewStateRecord | null {
  const content = readUtf8FileIfExistsSync(statePath);
  if (content === null) return null;

  const value = JSON.parse(content) as unknown;
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(
      `${REVIEW_STATE_ERROR_MESSAGES.STATE_INVALID}: ${statePath}`,
    );
  const candidate = value as Record<string, unknown>;
  const fileHashes = candidate.fileHashes;
  const validStrings = REVIEW_STATE_REQUIRED_STRING_FIELDS.every(
    (field) => typeof candidate[field] === 'string',
  );
  const validFileHashes =
    !!fileHashes &&
    typeof fileHashes === 'object' &&
    !Array.isArray(fileHashes) &&
    Object.values(fileHashes).every((hash) => typeof hash === 'string');
  if (
    candidate.schemaVersion !== REVIEW_STATE_SCHEMA_VERSION ||
    !validStrings ||
    !validFileHashes ||
    !REVIEW_STATE_PHASE_VALUES.includes(
      candidate.phase as (typeof REVIEW_STATE_PHASE_VALUES)[number],
    ) ||
    (candidate.sealedAt !== undefined && typeof candidate.sealedAt !== 'string')
  )
    throw new Error(
      `${REVIEW_STATE_ERROR_MESSAGES.STATE_INVALID}: ${statePath}`,
    );

  return candidate as unknown as ReviewStateRecord;
}
