import { REVIEW_EVIDENCE_SCHEMA_VERSION } from '../../../../constants/reviewState.js';
import { escapeMarkdownCell } from '../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../scope/utils/renderMarkdownTable.js';

import type { RenderSessionMarkdownInput } from './reviewBriefTypes.js';

/**
 * Return every creation-ordered group containing a unit for one path.
 * @param path Project-relative roster path.
 * @param groups Deterministic groups in creation order.
 * @returns Comma-separated group identifiers.
 */
function groupIdsForPath(
  path: string,
  groups: RenderSessionMarkdownInput['groups'],
): string {
  return groups
    .filter((group) => group.units.some((unit) => unit.path === path))
    .map(({ id }) => id)
    .join(',');
}

/**
 * Render the canonical v7 orchestration session and complete roster checklist.
 * @param input Prepared review identity, roster, and group facts.
 * @returns Canonical session Markdown with one trailing newline.
 */
export function renderSessionMarkdown(
  input: RenderSessionMarkdownInput,
): string {
  const checklist = renderMarkdownTable(
    ['Path', 'Change', 'Status', 'Reason', 'Group'],
    input.files.map((file) => [
      escapeMarkdownCell(file.path),
      file.change,
      file.skipReason ? 'skipped' : 'pending',
      escapeMarkdownCell(file.skipReason ?? ''),
      groupIdsForPath(file.path, input.groups),
    ]),
  );
  return [
    '---',
    `review_schema: ${REVIEW_EVIDENCE_SCHEMA_VERSION}`,
    `branch: ${JSON.stringify(input.branchName)}`,
    `base_ref: ${JSON.stringify(input.baseRef)}`,
    `source_hash: ${input.sourceHash}`,
    `review_directory: ${JSON.stringify(input.reviewDirectory)}`,
    `changed_files_count: ${input.files.length}`,
    `effort: ${input.effort}`,
    `created_at: ${input.createdAt}`,
    '---',
    '',
    '## Change Context',
    '',
    '<!-- pending: orchestrator writes the pull-request or commit summary here -->',
    '',
    '## Review Checklist',
    '',
    checklist,
    '',
  ].join('\n');
}
