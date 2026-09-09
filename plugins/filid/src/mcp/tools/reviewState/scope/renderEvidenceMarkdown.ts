import { REVIEW_EVIDENCE_SCHEMA_VERSION } from '../../../../constants/reviewState.js';
import type { ReviewEvidenceModel } from '../state/reviewStateTypes.js';

import { summarizeOutOfScopeViolations } from './summarizeOutOfScopeViolations.js';
import { escapeMarkdownCell } from './utils/escapeMarkdownCell.js';
import { renderMarkdownCodeCell } from './utils/renderMarkdownCodeCell.js';
import { renderMarkdownTable } from './utils/renderMarkdownTable.js';

/**
 * Render one canonical evidence.md document from deterministic scope facts.
 * @param model Snapshot identities, statuses, roster, candidates and diagnostics.
 * @returns Complete Markdown document with stable section and column order.
 */
export function renderEvidenceMarkdown(model: ReviewEvidenceModel): string {
  const changedScope = renderMarkdownTable(
    ['Path', 'Change', 'Role', 'Owner', 'Churn'],
    model.files.map((file) => [
      renderMarkdownCodeCell(file.path),
      file.change,
      file.role,
      file.owner ? renderMarkdownCodeCell(file.owner) : '—',
      `+${file.insertions}/-${file.deletions}`,
    ]),
  );
  const candidates = renderMarkdownTable(
    ['ID', 'Category', 'Severity', 'Path', 'Rule', 'Message'],
    model.candidates.map((candidate) => [
      candidate.id,
      candidate.category,
      candidate.severity,
      renderMarkdownCodeCell(candidate.path),
      renderMarkdownCodeCell(candidate.rule),
      escapeMarkdownCell(candidate.message),
    ]),
  );
  const informational = renderMarkdownTable(
    ['Category', 'Severity', 'Path', 'Rule', 'Message'],
    model.informational.map((row) => [
      row.category,
      row.severity,
      renderMarkdownCodeCell(row.path),
      renderMarkdownCodeCell(row.rule),
      escapeMarkdownCell(row.message),
    ]),
    true,
  );
  const outOfScope = renderMarkdownTable(
    ['Source', 'Rule', 'Severity', 'Count'],
    summarizeOutOfScopeViolations(model.outOfScope).map((row) => [
      row.source,
      renderMarkdownCodeCell(row.rule),
      row.severity,
      String(row.count),
    ]),
    true,
  );
  const diagnostics =
    model.diagnostics.length === 0
      ? 'none'
      : model.diagnostics
          .map(
            (diagnostic) =>
              `- ${renderMarkdownCodeCell(diagnostic.code)} — ${escapeMarkdownCell(diagnostic.message)}${diagnostic.path ? ` (${renderMarkdownCodeCell(diagnostic.path)})` : ''}; impact: ${escapeMarkdownCell(diagnostic.affects?.join(', ') || 'unknown')}${diagnostic.causeId ? `; causeId: ${renderMarkdownCodeCell(diagnostic.causeId)}` : ''}${diagnostic.specifier ? `; target: ${renderMarkdownCodeCell(diagnostic.specifier)}` : ''}`,
          )
          .join('\n');
  return [
    [
      '---',
      `review_schema: ${REVIEW_EVIDENCE_SCHEMA_VERSION}`,
      `source_hash: ${model.sourceHash}`,
      `snapshot_hash: ${model.snapshotHash}`,
      `evidence_complete: ${model.evidenceComplete}`,
      `structure_status: ${model.structure}`,
      `verification_status: ${model.verification}`,
      ...(model.analysisAxes
        ? [
            `dependencies_certainty: ${model.analysisAxes.dependencies}`,
            `verification_certainty: ${model.analysisAxes.verification}`,
          ]
        : []),
      `worktree: ${model.worktree}`,
      `created_at: ${model.createdAt}`,
      '---',
    ].join('\n'),
    `## Changed Scope\n\n${changedScope}`,
    `## Candidates\n\n${candidates}`,
    `## Informational\n\n${informational}`,
    `## Out-of-scope Observations\n\n${outOfScope}`,
    `## Diagnostics\n\n${diagnostics}`,
  ]
    .join('\n\n')
    .concat('\n');
}
