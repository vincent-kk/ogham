import { mergeVerifierAssignment } from '../opinion/mergeVerifierAssignment.js';
import { escapeMarkdownCell } from '../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../scope/utils/renderMarkdownTable.js';

import type { RenderVerifyBriefInput } from './reviewBriefTypes.js';
import { renderBriefDiffs } from './utils/renderBriefDiffs.js';
import { renderReviewUnitRow } from './utils/renderReviewUnitRow.js';
import { renderVerifyOpinionExample } from './utils/renderVerifyOpinionExample.js';

/** Verifier method section that begins the materialized assignment instructions. */
const DELIVERABLE_HEADING_PATTERN = /^## Deliverable\r?$/m;

/**
 * Render one verifier brief containing only independently assigned findings.
 * @param input Group files, located findings, method, diffs, and source identity.
 * @returns Verifier Markdown containing the exact v7 output contract.
 */
export function renderVerifyBrief(input: RenderVerifyBriefInput): string {
  const { assigned } = mergeVerifierAssignment(
    input.findings,
    input.group.priorFindings,
  );
  const deliverable = input.verifierMethod.search(DELIVERABLE_HEADING_PATTERN);
  if (deliverable < 0)
    throw new Error('Verifier method is missing its Deliverable section.');
  const filesByPath = new Map(input.files.map((file) => [file.path, file]));
  const files = renderMarkdownTable(
    [
      'Path',
      'Change',
      'Role',
      'Owner',
      'Chunk',
      'Churn',
      'Diff Path',
      'New-file Hunk Ranges',
    ],
    input.group.units.map((unit) => {
      const file = filesByPath.get(unit.path);
      if (!file)
        throw new Error(`Review unit is absent from roster: ${unit.path}`);
      return renderReviewUnitRow(unit, file);
    }),
  );
  const decisions = renderMarkdownTable(
    [
      'ID',
      'Category',
      'Severity',
      'Path',
      'Lines',
      'inDiff',
      'Rule',
      'Message',
      'Evidence',
      'Consequence',
      'existingCode',
    ],
    [
      ...assigned.map((finding) => [
        finding.id,
        finding.category,
        finding.severity,
        escapeMarkdownCell(finding.path),
        finding.lines,
        String(finding.inDiff),
        finding.rule,
        escapeMarkdownCell(finding.message),
        escapeMarkdownCell(finding.evidence),
        escapeMarkdownCell(finding.consequence),
        escapeMarkdownCell(finding.existingCode),
      ]),
    ],
    true,
  );
  const outputContract = renderVerifyOpinionExample(input);
  return [
    '---',
    `group: ${input.group.id}`,
    `source_hash: ${input.sourceHash}`,
    `output: ${input.group.verifyPath}`,
    '---',
    '',
    input.verifierMethod.slice(deliverable),
    '',
    '## Files',
    '',
    files,
    '',
    '## Diffs',
    '',
    renderBriefDiffs(input.diffs),
    '',
    '## Decisions Required',
    '',
    decisions,
    '',
    '## Output Contract',
    '',
    '```json',
    outputContract,
    '```',
    '',
    'The fenced object is a valid shape example. Replace all illustrative text with verification evidence and return only the JSON object in the opinion file.',
    '',
    '- `state` must be `COMPLETE` or `INDETERMINATE`.',
    '- The `decisions` array must contain every ID in Decisions Required exactly once and no other ID.',
    '- `verdict` must be `CONFIRMED`, `REFUTED`, or `INDETERMINATE`.',
    '- resolution?: {question, evidenceNeeded, nextAction, doneWhen, suggestedOwner, humanReason?, options?} is allowed only with an INDETERMINATE decision or opinion. Use the reviewer bounds; human requires humanReason and 2–5 distinct nonblank options of at most 300 characters each. Recoverable evidence belongs to agent; unsupported analysis names its limitation and required capability. It proposes a route, not authority.',
    '- Every decision requires non-empty independent `evidence` and a falsifiable `reason`.',
    '- Each observation requires a non-empty `path` and `detail`.',
    '',
  ].join('\n');
}
