import {
  REVIEW_HANDOFF_CLASS_ORDER,
  REVIEW_HANDOFF_COLLAPSE_THRESHOLD,
  REVIEW_HANDOFF_TABLE_ROW_LIMIT,
  type ReviewHandoffClass,
} from '../../../../constants/reviewState.js';

import type {
  ReviewHandoffEntry,
  ReviewHandoffSeed,
} from './reviewHandoffSeedSchema.js';
import { serializeHandoffBlock } from './serializeHandoffBlock.js';
import { escapeMarkdownCell } from './utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from './utils/renderMarkdownTable.js';

/**
 * Find the longest shared path prefix on segment boundaries.
 * @param entries Same-class and same-rule claims selected for one display row.
 * @returns Shared project-relative ancestor, or `.` when none is shared.
 */
function commonHandoffPath(entries: readonly ReviewHandoffEntry[]): string {
  const paths = entries.map((entry) =>
    entry.path === '.' ? [] : entry.path.split('/'),
  );
  const common = [...(paths[0] ?? [])];
  for (const path of paths.slice(1))
    while (common.some((segment, index) => path[index] !== segment))
      common.pop();
  return common.join('/') || '.';
}

/**
 * Escape one human-readable handoff table cell without changing machine data.
 * @param value Bounded claim value rendered into Markdown and HTML.
 * @returns Single-line Markdown cell with HTML metacharacters encoded.
 */
function escapeHandoffCell(value: string): string {
  return escapeMarkdownCell(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * Render the human projection and canonical machine block for one PR handoff.
 * @param seed Schema-valid handoff seed whose recorded entries are canonical.
 * @param counts Complete class counts calculated before machine-block truncation.
 * @returns Complete `## FCA Handoff` section ready for atomic file output.
 */
export function renderHandoffMarkdown(
  seed: ReviewHandoffSeed,
  counts: Record<ReviewHandoffClass, number>,
): string {
  const block = serializeHandoffBlock(seed);
  if (seed.recorded.length === 0)
    return ['## FCA Handoff', '', 'None', '', block].join('\n').concat('\n');

  const grouped = new Map<string, ReviewHandoffEntry[]>();
  for (const entry of seed.recorded) {
    const key = JSON.stringify([entry.class, entry.ruleId]);
    const entries = grouped.get(key) ?? [];
    entries.push(entry);
    grouped.set(key, entries);
  }
  const rows: string[][] = [];
  for (const entries of grouped.values())
    if (entries.length > REVIEW_HANDOFF_COLLAPSE_THRESHOLD)
      rows.push([
        entries[0].class,
        entries[0].ruleId,
        commonHandoffPath(entries),
        entries[0].certainty,
        `${entries.length} findings`,
      ]);
    else
      rows.push(
        ...entries.map((entry) => [
          entry.class,
          entry.ruleId,
          entry.path,
          entry.certainty,
          entry.note,
        ]),
      );
  const visibleRows = rows
    .slice(0, REVIEW_HANDOFF_TABLE_ROW_LIMIT)
    .map((row) => row.map(escapeHandoffCell));
  const omittedRows = rows.length - visibleRows.length;
  const omittedClaims =
    seed.truncated > 0
      ? `, ${seed.truncated} omitted from the machine block`
      : '';
  const summary = `<summary>FCA findings carried to review — ${seed.recorded.length} recorded, ${seed.repaired} repaired in Stage 1${omittedClaims}</summary>`;
  const countLine = `Counts: ${REVIEW_HANDOFF_CLASS_ORDER.map(
    (handoffClass) => `${counts[handoffClass]} ${handoffClass}`,
  ).join(', ')}.`;
  const table = renderMarkdownTable(
    ['Class', 'Rule', 'Path', 'Certainty', 'Note'],
    visibleRows,
  );
  return [
    '## FCA Handoff',
    '',
    '<details>',
    summary,
    '',
    countLine,
    '',
    table,
    ...(omittedRows > 0
      ? ['', `… and ${omittedRows} more (see machine block)`]
      : []),
    '',
    '</details>',
    '',
    block,
  ]
    .join('\n')
    .concat('\n');
}
