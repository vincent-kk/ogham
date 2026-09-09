import { normalize, portableJoin } from '@ogham/cross-platform';

import { REVIEW_STATE_FILE_NAMES } from '../../../../../constants/reviewState.js';
import type { ReviewRenderInput } from '../reviewRenderTypes.js';

import { escapeReviewBlockerText } from './escapeReviewBlockerText.js';
import { sortReviewBlockers } from './sortReviewBlockers.js';

/**
 * Put a bounded actionable index before bulk review details without inventing remote links.
 * @param input Shared sealed identity and blocker model.
 * @param destination Whether links target a local report or a remotely published comment.
 * @returns At most five questions and next actions, or no section for conclusive reviews.
 */
export function renderBlockerSummary(
  input: ReviewRenderInput,
  destination: 'report' | 'comment',
): string {
  if (input.fold.blockers.length === 0) return '';
  const blockers = sortReviewBlockers(input.fold.blockers);
  const path = normalize(
    portableJoin(input.reviewDirectory, REVIEW_STATE_FILE_NAMES.BLOCKERS),
  );
  return [
    `${destination === 'report' ? '##' : '###'} Review blockers`,
    '',
    `${blockers.length} unresolved review blockers. Indeterminate decision counts are separate.`,
    '',
    ...blockers
      .slice(0, 5)
      .map(
        (blocker) =>
          `- ${destination === 'report' ? `[${blocker.id}](${REVIEW_STATE_FILE_NAMES.BLOCKERS}#${blocker.id.toLowerCase()})` : `**${blocker.id}**`}: ${escapeReviewBlockerText(blocker.resolution.question)} — ${escapeReviewBlockerText(blocker.resolution.nextAction)} (${blocker.attention})`,
      ),
    ...(blockers.length > 5
      ? [
          '',
          `${blockers.length - 5} more; the full blocker report preserves every item.`,
        ]
      : []),
    '',
    destination === 'report'
      ? `[Full blocker report](${REVIEW_STATE_FILE_NAMES.BLOCKERS})`
      : `Full blocker report (local artifact, not published here): ${escapeReviewBlockerText(path)}`,
    '',
    'Proposed owners and actions are not assignments or permission. New evidence must be validated before reconsidering the verdict.',
  ].join('\n');
}
