import { REVIEW_RESOLUTION_SCHEMA } from '../opinion/utils/reviewResolutionSchema.js';
import { escapeMarkdownCell } from '../scope/utils/escapeMarkdownCell.js';
import { renderMarkdownTable } from '../scope/utils/renderMarkdownTable.js';

import type { RenderReviewBriefInput } from './reviewBriefTypes.js';
import { renderBriefDiffs } from './utils/renderBriefDiffs.js';
import { renderChangeContext } from './utils/renderChangeContext.js';
import { renderHandoffSection } from './utils/renderHandoffSection.js';
import { renderReviewUnitRow } from './utils/renderReviewUnitRow.js';

/** Require a numeric Zod boundary before publishing it in every reviewer brief. */
function requireSchemaBound(
  value: number | null | undefined,
  field: string,
): number {
  if (value === null || value === undefined)
    throw new Error(`Review resolution schema must bound ${field}.`);
  return value;
}

/** Require a trimmed schema string to remain nonblank before rendering its cap. */
function requireNonblankStringLimit(
  minimum: number | null,
  maximum: number | null,
  field: string,
): number {
  if (requireSchemaBound(minimum, `${field} minimum`) !== 1)
    throw new Error(`Review resolution schema must keep ${field} nonblank.`);
  return requireSchemaBound(maximum, `${field} maximum`);
}

/** Render the terse resolution contract from the authoritative Zod schema. */
function renderReviewResolutionContract(): string {
  const {
    question,
    evidenceNeeded,
    nextAction,
    doneWhen,
    suggestedOwner,
    humanReason,
  } = REVIEW_RESOLUTION_SCHEMA.innerType().shape;
  const nextActionLimit = requireNonblankStringLimit(
    nextAction.minLength,
    nextAction.maxLength,
    'nextAction',
  );
  const doneWhenLimit = requireNonblankStringLimit(
    doneWhen.minLength,
    doneWhen.maxLength,
    'doneWhen',
  );
  const actionContract =
    nextActionLimit === doneWhenLimit
      ? `nextAction/doneWhen≤${nextActionLimit}`
      : `nextAction≤${nextActionLimit},doneWhen≤${doneWhenLimit}`;

  return [
    `question≤${requireNonblankStringLimit(question.minLength, question.maxLength, 'question')}`,
    `evidenceNeeded=${requireSchemaBound(evidenceNeeded._def.minLength?.value, 'evidenceNeeded count minimum')}..${requireSchemaBound(evidenceNeeded._def.maxLength?.value, 'evidenceNeeded count maximum')}×≤${requireNonblankStringLimit(evidenceNeeded.element.minLength, evidenceNeeded.element.maxLength, 'evidenceNeeded item')}`,
    actionContract,
    `suggestedOwner=${suggestedOwner.options.join('|')}`,
    `humanReason?≤${requireNonblankStringLimit(humanReason.unwrap().minLength, humanReason.unwrap().maxLength, 'humanReason')}(human:required)`,
    'options?=2..5×≤300(human:required)',
  ].join(',');
}

/**
 * Render one reviewer brief while keeping the full roster in the shared checklist.
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
      return renderReviewUnitRow(unit, file);
    }),
  );
  const priorGroups = input.group.dependsOn;
  const priorOpinions = priorGroups.length
    ? priorGroups.map((id) => `- opinions/review-${id}.json`).join('\n')
    : 'none';
  const groupPaths = new Set(input.group.units.map(({ path }) => path));
  const otherFiles = input.files.filter(({ path }) => !groupPaths.has(path));
  const rosterSummary = otherFiles.length
    ? `${otherFiles.length} other changed files: ../session.md (Review Checklist). Search callers/consumers only; never read the full roster.`
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
  const outputPath =
    round === 1
      ? input.group.skeletonPath
      : `opinions/review-${input.group.id}.r${String(round)}.json`;
  return [
    '---',
    `group: ${input.group.id}`,
    `rounds: ${input.group.rounds}`,
    `plan_required: ${input.group.planRequired}`,
    `risk_reasons: ${JSON.stringify(input.group.riskReasons ?? [])}`,
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
    ...(input.handoff
      ? [
          renderHandoffSection(input.handoff, [
            ...new Set(input.group.units.map((unit) => unit.path)),
          ]),
          '',
        ]
      : []),
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
    rosterSummary,
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
    'Use prewritten JSON skeleton; keep keys/units',
    '- files: result=reviewed|skipped; skipped needs reason; retain chunk ("k/n" or null).',
    '- checked: COMPLETE=>nonempty nonblank-string[]',
    `- gaps: []|[{path,rule,detail,causeId?,resolution?:{${renderReviewResolutionContract()}}}]; nonblank.`,
    `- findings: [{id:R${input.group.id}-NNN,severity:error|warning,category:bug|security|performance|maintainability|test|documentation|contract|structure|verification,path,existingCode,lines,rule,message,evidence,consequence,recommendedAction}]; nonblank text; assigned path; lines=range|unknown.`,
    '',
  ].join('\n');
}
