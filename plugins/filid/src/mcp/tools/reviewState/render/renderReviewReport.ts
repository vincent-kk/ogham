import { REVIEW_STATE_FILE_NAMES } from '../../../../constants/reviewState.js';

import type { ReviewRenderInput } from './reviewRenderTypes.js';
import { renderBlockerSummary } from './utils/renderBlockerSummary.js';
import { renderConfirmedFindingsTable } from './utils/renderConfirmedFindingsTable.js';
import { renderCoverageSummary } from './utils/renderCoverageSummary.js';
import { renderCoverageTable } from './utils/renderCoverageTable.js';
import { renderRefutedCandidatesTable } from './utils/renderRefutedCandidatesTable.js';
import { renderReviewReuseSummary } from './utils/renderReviewReuseSummary.js';
import { renderScopeTable } from './utils/renderScopeTable.js';
import { renderUnresolvedEvidenceTable } from './utils/renderUnresolvedEvidenceTable.js';
import { renderVerificationLogTable } from './utils/renderVerificationLogTable.js';

/**
 * Render the canonical schema-7 cross-review report from a verdict fold.
 *
 * @param input Prepared identity, evidence, roster, and deterministic fold.
 * @returns Canonical report Markdown with one trailing newline.
 */
export function renderReviewReport(input: ReviewRenderInput): string {
  const finalReason =
    input.fold.verdict === 'INCONCLUSIVE'
      ? 'Review evidence is incomplete or unresolved.'
      : input.fold.verdict === 'REQUEST_CHANGES'
        ? 'Confirmed findings require bounded corrections.'
        : 'All reviewable scope is covered with no confirmed findings.';
  const evidenceStatus = [
    '| Field | Value |',
    '| --- | --- |',
    `| source_hash | ${input.evidence.sourceHash} |`,
    `| snapshot_hash | ${input.evidence.snapshotHash} |`,
    `| evidence_complete | ${String(input.evidence.evidenceComplete)} |`,
    `| structure_status | ${input.evidence.structureStatus} |`,
    `| verification_status | ${input.evidence.verificationStatus} |`,
    `| worktree | ${input.evidence.worktree} |`,
  ].join('\n');

  return [
    '---',
    'review_schema: 7',
    `verdict: ${input.fold.verdict}`,
    ...(input.fold.verdict === 'INCONCLUSIVE'
      ? [`blockers_report: ${REVIEW_STATE_FILE_NAMES.BLOCKERS}`]
      : []),
    `branch: ${input.branchName}`,
    `base_ref: ${input.baseRef}`,
    `source_hash: ${input.evidence.sourceHash}`,
    `snapshot_hash: ${input.evidence.snapshotHash}`,
    `files_total: ${input.fold.filesTotal}`,
    `files_reviewed: ${input.fold.filesReviewed}`,
    `files_skipped: ${input.fold.filesSkipped}`,
    `generated_at: ${input.generatedAt}`,
    '---',
    '',
    `# Cross-Review — ${input.branchName}`,
    '',
    ...(input.fold.verdict === 'INCONCLUSIVE'
      ? [renderBlockerSummary(input, 'report'), '']
      : []),
    '## Scope',
    '',
    renderScopeTable(input.files),
    '',
    '## Evidence Status',
    '',
    evidenceStatus,
    '',
    ...(input.reuse
      ? ['### Incremental Reuse', '', renderReviewReuseSummary(input.reuse), '']
      : []),
    '## Coverage',
    '',
    renderCoverageSummary(input.fold.checklist),
    '',
    renderCoverageTable(input.fold.checklist),
    '',
    '## Verification Log',
    '',
    renderVerificationLogTable(input.fold.decisions),
    '',
    '## Confirmed Findings',
    '',
    renderConfirmedFindingsTable(input.fold.confirmed),
    '',
    '## Refuted Candidates',
    '',
    renderRefutedCandidatesTable(input.fold.refuted),
    '',
    '## Unresolved Evidence',
    '',
    renderUnresolvedEvidenceTable(input.fold.unresolved),
    '',
    '## Final Verdict',
    '',
    `**${input.fold.verdict}** — ${finalReason}`,
    '',
  ].join('\n');
}
