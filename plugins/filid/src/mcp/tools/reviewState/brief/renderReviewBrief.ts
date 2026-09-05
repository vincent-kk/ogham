import { escapeMarkdownCell } from '../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../scope/utils/renderMarkdownTable.js';
import type { ReviewHunk, ReviewUnit } from '../state/reviewGroupTypes.js';

import type { RenderReviewBriefInput } from './reviewBriefTypes.js';
import { renderBriefDiffs } from './utils/renderBriefDiffs.js';
import { renderChangeContext } from './utils/renderChangeContext.js';
import { renderReviewOpinionExample } from './utils/renderReviewOpinionExample.js';

/**
 * Render a chunk identity for a human-facing Markdown table.
 * @param chunk Optional one-based chunk identity.
 * @returns Fraction text or an empty unchunked marker.
 */
function renderChunk(chunk: ReviewUnit['chunk']): string {
  return chunk ? `${chunk.index}/${chunk.total}` : '';
}

/**
 * Render one unit's ordered new-file ranges without inventing context.
 * @param hunks Unit hunk ranges in diff order.
 * @returns Comma-separated inclusive ranges.
 */
function renderNewRanges(hunks: readonly ReviewHunk[]): string {
  return hunks.map((hunk) => `${hunk.newStart}-${hunk.newEnd}`).join(', ');
}

/**
 * Render one deterministic reviewer brief with the full roster kept visible.
 * @param input Group, roster, candidates, and resolved rule bodies.
 * @param round One-based reviewer round whose opinion path the brief targets.
 * @returns Reviewer Markdown containing the exact v7 output contract.
 */
export function renderReviewBrief(
  input: RenderReviewBriefInput,
  round = 1,
): string {
  const filesByPath = new Map(input.files.map((file) => [file.path, file]));
  const filesTable = renderMarkdownTable(
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
      return [
        escapeMarkdownCell(unit.path),
        unit.change,
        file.role,
        escapeMarkdownCell(file.owner ?? ''),
        renderChunk(unit.chunk),
        String(unit.churn),
        escapeMarkdownCell(unit.diffPath),
        renderNewRanges(unit.hunks),
      ];
    }),
  );
  const priorGroups = input.group.dependsOn;
  const priorOpinions = priorGroups.length
    ? priorGroups.map((id) => `- opinions/review-${id}.json`).join('\n')
    : 'none';
  const groupPaths = new Set(input.group.units.map(({ path }) => path));
  const otherFiles = input.files.filter(({ path }) => !groupPaths.has(path));
  const rosterTable = otherFiles.length
    ? renderMarkdownTable(
        ['Path', 'Change', 'Role'],
        otherFiles.map((file) => [
          escapeMarkdownCell(file.path),
          file.change,
          file.role,
        ]),
      )
    : 'none';
  const candidatesTable = renderMarkdownTable(
    [
      'ID',
      'Source',
      'Scope',
      'Category',
      'Severity',
      'Path',
      'Rule',
      'Message',
    ],
    input.candidates.map((candidate) => [
      candidate.id,
      candidate.source,
      escapeMarkdownCell(candidate.scope),
      candidate.category,
      candidate.severity,
      escapeMarkdownCell(candidate.path),
      candidate.rule,
      escapeMarkdownCell(candidate.message),
    ]),
    true,
  );
  const repositoryRules = input.repositoryRules.length
    ? input.repositoryRules.map((path) => `- ${path}`).join('\n')
    : 'none';
  const rules = [...input.rules]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(({ id, body }) => `### ${id}\n\n${body.trimEnd()}`)
    .join('\n\n');
  const outputContract = renderReviewOpinionExample(input, round);
  const outputPath =
    round === 1
      ? input.group.skeletonPath
      : `opinions/review-${input.group.id}.r${String(round)}.json`;
  return [
    '---',
    `group: ${input.group.id}`,
    `rounds: ${input.group.rounds}`,
    `plan_required: ${input.group.planRequired}`,
    `depends_on: ${JSON.stringify(input.group.dependsOn)}`,
    `source_hash: ${input.sourceHash}`,
    `base_ref: ${JSON.stringify(input.baseRef)}`,
    `output: ${outputPath}`,
    '---',
    '',
    input.reviewerMethod,
    '',
    '## Change Context',
    '',
    renderChangeContext(input.changeContext),
    '',
    '## Files',
    '',
    filesTable,
    '',
    '## Diffs',
    '',
    renderBriefDiffs(input.diffs),
    '',
    '## Prior Opinions',
    '',
    priorOpinions,
    '',
    '## Other Changed Files',
    '',
    rosterTable,
    '',
    '## FCA Candidates',
    '',
    candidatesTable,
    '',
    '## Repository Rules',
    '',
    repositoryRules,
    '',
    '## Rules',
    '',
    rules || 'none',
    '',
    '## Output Contract',
    '',
    '```json',
    outputContract,
    '```',
    '',
    'The fenced object is a valid shape example. Replace all illustrative text with review evidence and return only the JSON object in the opinion file.',
    '',
    '- `state` must be `COMPLETE` or `INDETERMINATE`.',
    '- `files` must contain every assigned `(path, change, chunk)` exactly once and no unassigned unit.',
    '- `chunk` must be `"k/n"` for a chunked unit and `null` for an unchunked unit.',
    '- `result` must be `reviewed` or `skipped`. A `skipped` result requires a non-empty `reason`.',
    '- Finding `severity` must be `error` or `warning`.',
    '- Finding `category` must be `bug`, `security`, `performance`, `maintainability`, `test`, `documentation`, `contract`, `structure`, or `verification`.',
    '- `existingCode` is required and must not be empty. `lines` may be `unknown`; validation resolves it from committed source.',
    '- `INDETERMINATE` requires at least one non-empty `gaps` entry.',
    '- `riskPlan` is a string or `null`.',
    '',
  ].join('\n');
}
