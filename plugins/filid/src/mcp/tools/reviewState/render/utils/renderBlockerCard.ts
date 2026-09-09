import type { ReviewBlocker } from '../../verdict/reviewVerdictTypes.js';

import { escapeReviewBlockerText } from './escapeReviewBlockerText.js';

/**
 * Render one identifiable unresolved question and every preserved resolution proposal.
 * @param blocker Finalized source-backed blocker; advice remains non-executable data.
 * @returns A stable ID heading and vertically readable evidence and action fields.
 */
export function renderBlockerCard(blocker: ReviewBlocker): string {
  const scope =
    Object.entries(blocker.scope)
      .filter(([, value]) => value !== null)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ') || 'global';
  const proposals = [blocker.resolution, ...blocker.alternativeResolutions];
  return [
    `### ${blocker.id}`,
    '',
    ...(blocker.causeId
      ? [`Cause: ${escapeReviewBlockerText(blocker.causeId)}`, '']
      : []),
    ...blocker.occurrences.map(
      (occurrence) =>
        `- Affected: ${escapeReviewBlockerText(JSON.stringify(occurrence.scope))} — ${escapeReviewBlockerText(occurrence.detail)}`,
    ),
    '',
    ...proposals.flatMap((advice, index) => [
      ...(index > 0
        ? [`**Alternative ${index} — Conflicting proposals**`, '']
        : []),
      `**Question** — ${escapeReviewBlockerText(advice.question)}`,
      '',
      ...(index === 0
        ? [
            `**Currently unknown** — ${escapeReviewBlockerText(blocker.detail)}`,
            '',
            `**Scope** — ${escapeReviewBlockerText(scope)}`,
            '',
          ]
        : []),
      '**Evidence needed**',
      '',
      ...advice.evidenceNeeded.map(
        (value) => `- ${escapeReviewBlockerText(value)}`,
      ),
      '',
      `**Next action** — ${escapeReviewBlockerText(advice.nextAction)}`,
      '',
      `**Proposed owner** — ${advice.suggestedOwner}${advice.humanReason ? `: ${escapeReviewBlockerText(advice.humanReason)}` : ''}`,
      ...(advice.options ?? []).map(
        (option) => `- Choice: ${escapeReviewBlockerText(option)}`,
      ),
      '',
      `**Completion condition** — ${escapeReviewBlockerText(advice.doneWhen)}`,
      '',
    ]),
    `Advice source: ${blocker.adviceSource}.`,
    '',
    '**Sources**',
    '',
    ...blocker.sources.map(
      (source) =>
        `- ${escapeReviewBlockerText(source.artifactPath)}${source.pointer !== undefined ? ` — JSON pointer ${escapeReviewBlockerText(source.pointer || '/')}` : ''}${source.anchor ? ` — section ${escapeReviewBlockerText(source.anchor)}` : ''}`,
    ),
  ].join('\n');
}
