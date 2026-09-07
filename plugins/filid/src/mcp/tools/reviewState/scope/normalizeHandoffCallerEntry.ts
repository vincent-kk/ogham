import {
  REVIEW_HANDOFF_NOTE_LIMIT,
  REVIEW_HANDOFF_PATH_LIMIT,
  REVIEW_HANDOFF_RULE_ID_LIMIT,
} from '../../../../constants/reviewState.js';
import type { ReviewHandoffCallerEntry } from '../state/reviewStateTypes.js';

import type { ReviewHandoffEntry } from './reviewHandoffSeedSchema.js';

/**
 * Replace an oversized caller path with its nearest serializable ancestor.
 * @param path Project-relative path supplied with a caller claim.
 * @returns A real ancestor within the handoff path limit, or project root.
 */
function boundCallerPath(path: string): string {
  let bounded = path;
  while (bounded.length > REVIEW_HANDOFF_PATH_LIMIT && bounded.includes('/'))
    bounded = bounded.slice(0, bounded.lastIndexOf('/'));
  if (bounded.length === 0 || bounded.length > REVIEW_HANDOFF_PATH_LIMIT)
    return '.';
  return bounded;
}

/**
 * Normalize one caller claim before canonical seed validation.
 * @param entry Unbounded caller-authored claim with optional judgment fields.
 * @returns Canonically bounded claim with stable judgment defaults.
 */
export function normalizeHandoffCallerEntry(
  entry: ReviewHandoffCallerEntry,
): ReviewHandoffEntry {
  return {
    ...entry,
    ruleId: entry.ruleId.slice(0, REVIEW_HANDOFF_RULE_ID_LIMIT),
    path: boundCallerPath(entry.path),
    severity: entry.severity ?? 'warning',
    certainty: entry.certainty ?? 'unstated',
    note: entry.note.slice(0, REVIEW_HANDOFF_NOTE_LIMIT),
  };
}
