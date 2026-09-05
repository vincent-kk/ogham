import { portableJoin } from '@ogham/cross-platform';

import { REVIEW_STATE_FILE_NAMES } from '../../../../constants/reviewState.js';

import type { ReviewRenderInput } from './reviewRenderTypes.js';
import { renderConfirmedFindingsTable } from './utils/renderConfirmedFindingsTable.js';
import { renderCoverageTable } from './utils/renderCoverageTable.js';
import { renderUnresolvedEvidenceTable } from './utils/renderUnresolvedEvidenceTable.js';
import { renderVerificationLogTable } from './utils/renderVerificationLogTable.js';

/**
 * Render the canonical governance comment for a pull-request publisher.
 *
 * @param input Prepared identity, report location, and deterministic fold.
 * @returns Markdown containing governance facts and exactly three details blocks.
 */
export function renderPrComment(input: ReviewRenderInput): string {
  const confirmed =
    input.fold.confirmed.length === 0
      ? 'None'
      : renderConfirmedFindingsTable(input.fold.confirmed);
  const affectsVerdict = input.fold.unresolved.filter(
    (entry) => entry.affectsVerdict,
  );
  const reportPath = portableJoin(
    input.reviewDirectory,
    REVIEW_STATE_FILE_NAMES.REPORT,
  );

  return [
    `## Code Review Governance — ${input.fold.verdict}`,
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Verdict | ${input.fold.verdict} |`,
    `| Branch | \`${input.branchName}\` |`,
    `| Base | \`${input.baseRef}\` |`,
    `| Snapshot | \`${input.evidence.snapshotHash || 'unavailable'}\` |`,
    `| Coverage | ${input.fold.filesReviewed} reviewed · ${input.fold.filesSkipped} skipped · ${input.fold.filesTotal} total |`,
    `| Findings | ${input.fold.confirmed.length} confirmed · ${input.fold.refuted.length} refuted · ${input.fold.indeterminate.length} indeterminate |`,
    `| Generated | ${input.generatedAt} |`,
    '',
    `<details><summary>Confirmed findings (${input.fold.confirmed.length})</summary>`,
    '',
    confirmed,
    '',
    '</details>',
    '',
    '<details><summary>Coverage and verification log</summary>',
    '',
    '### Coverage',
    '',
    renderCoverageTable(input.fold.checklist),
    '',
    '### Verification Log',
    '',
    renderVerificationLogTable(input.fold.decisions),
    '',
    '</details>',
    '',
    '<details><summary>Unresolved evidence</summary>',
    '',
    renderUnresolvedEvidenceTable(affectsVerdict),
    '',
    '</details>',
    '',
    `> Full report: \`${reportPath}\``,
    '',
  ].join('\n');
}
