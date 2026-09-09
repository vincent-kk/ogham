import { REVIEW_STATE_FILE_NAMES } from '../../../../constants/reviewState.js';

import type { ReviewRenderInput } from './reviewRenderTypes.js';
import { escapeReviewBlockerText } from './utils/escapeReviewBlockerText.js';
import { renderBlockerCard } from './utils/renderBlockerCard.js';
import { sortReviewBlockers } from './utils/sortReviewBlockers.js';

/** Source-backed attention groups in the order a reader should consider them. */
const BLOCKER_SECTIONS = [
  ['human-decision', 'Human decision requests'],
  ['triage', 'Needs triage'],
  ['evidence-recovery', 'Evidence recovery'],
] as const;

/**
 * Render only the questions preventing a conclusive review and how to resolve them.
 * @param input Shared sealed identity and the full deterministic blocker model.
 * @returns Complete blocker Markdown whenever evidence remains unresolved, otherwise null.
 */
export function renderReviewBlockers(input: ReviewRenderInput): string | null {
  if (input.fold.blockers.length === 0) return null;
  const blockers = sortReviewBlockers(input.fold.blockers);
  return [
    '---',
    'blockers_schema: 1',
    `source_hash: ${JSON.stringify(input.evidence.sourceHash)}`,
    `snapshot_hash: ${JSON.stringify(input.evidence.snapshotHash)}`,
    `branch: ${JSON.stringify(input.branchName)}`,
    `verdict: ${input.fold.verdict}`,
    '---',
    '',
    `# Review blockers — ${input.fold.verdict}`,
    '',
    `${blockers.length} unresolved review blockers. This report excludes confirmed findings, refutations, and normal exclusions.`,
    '',
    'Proposed owners and actions are not assignments or permission. Missing advice means triage, not a mandatory human decision.',
    '',
    '| ID | Question | Proposed route |',
    '| --- | --- | --- |',
    ...blockers
      .slice(0, 5)
      .map(
        (blocker) =>
          `| [${blocker.id}](#${blocker.id.toLowerCase()}) | ${escapeReviewBlockerText(blocker.resolution.question)} | ${blocker.attention} |`,
      ),
    ...(blockers.length > 5
      ? ['', `${blockers.length - 5} more questions appear in full below.`]
      : []),
    '',
    ...BLOCKER_SECTIONS.flatMap(([attention, title]) => [
      `## ${title}`,
      '',
      ...blockers
        .filter((blocker) => blocker.attention === attention)
        .flatMap((blocker) => [renderBlockerCard(blocker), '']),
      ...(blockers.some((blocker) => blocker.attention === attention)
        ? []
        : ['None.', '']),
    ]),
    '## After gathering evidence',
    '',
    'Validate the new evidence or recorded decision in the appropriate review workflow. A follow-up round does not erase accumulated gaps; a fresh review may be required. Do not edit a sealed verdict to mark a blocker resolved.',
    '',
    `[Full review evidence and findings](${REVIEW_STATE_FILE_NAMES.REPORT})`,
    '',
  ].join('\n');
}
