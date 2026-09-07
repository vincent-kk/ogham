import {
  REVIEW_HANDOFF_NOTE_LIMIT,
  REVIEW_HANDOFF_RULE_ID_LIMIT,
} from '../../../../constants/reviewState.js';
import type { ReviewHandoffCallerEntry } from '../state/reviewStateTypes.js';

import type { ReviewHandoffEntry } from './reviewHandoffSeedSchema.js';
import { boundHandoffPath } from './utils/boundHandoffPath.js';

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
    path: boundHandoffPath(entry.path),
    severity: entry.severity ?? 'warning',
    certainty: entry.certainty ?? 'unstated',
    note: entry.note.slice(0, REVIEW_HANDOFF_NOTE_LIMIT),
  };
}
