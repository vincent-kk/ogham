import type { ReviewValidationProblem } from '../state/reviewStateTypes.js';

import type {
  CheckReviewOpinionOptions,
  UncheckedReviewOpinion,
} from './uncheckedOpinionTypes.js';
import { reviewUnitKey } from './utils/reviewUnitKey.js';

/** Reviewer completion states admitted by schema seven. */
const REVIEW_OPINION_STATES = new Set<string>(['COMPLETE', 'INDETERMINATE']);

/** Reviewer finding severities admitted by schema seven. */
const REVIEW_FINDING_SEVERITIES = new Set<string>(['error', 'warning']);

/** Reviewer finding categories admitted by schema seven. */
const REVIEW_FINDING_CATEGORIES = new Set<string>([
  'bug',
  'security',
  'performance',
  'maintainability',
  'test',
  'documentation',
  'contract',
  'structure',
  'verification',
]);

/** Reviewer coverage results admitted by schema seven. */
const REVIEW_FILE_RESULTS = new Set<string>(['reviewed', 'skipped']);

/**
 * Check a structurally parsed reviewer opinion against its prepared group.
 *
 * @param opinion Structurally valid but semantically untrusted opinion.
 * @param options Authoritative group, round, source, and unit identity.
 * @returns Every contract problem found in deterministic traversal order.
 */
export function checkReviewOpinion(
  opinion: UncheckedReviewOpinion,
  options: CheckReviewOpinionOptions,
): ReviewValidationProblem[] {
  const problems: ReviewValidationProblem[] = [];
  if (opinion.schema !== 7)
    problems.push({ code: 'schema-mismatch', detail: 'Expected schema 7.' });
  if (opinion.group !== options.group)
    problems.push({
      code: 'schema-mismatch',
      detail: 'Group does not match prepared state.',
    });
  if (opinion.round !== options.round)
    problems.push({
      code: 'schema-mismatch',
      detail: 'Round does not match the requested round.',
    });
  if (opinion.sourceHash !== options.sourceHash)
    problems.push({
      code: 'source-hash-mismatch',
      detail: 'Source hash does not match prepared state.',
    });
  if (!REVIEW_OPINION_STATES.has(opinion.state))
    problems.push({
      code: 'enum-invalid',
      detail: 'Reviewer state is not recognized.',
    });

  const expectedCounts = new Map<string, number>();
  const expectedPaths = new Map<string, string>();
  const assignedPaths = new Set<string>();
  for (const unit of options.units) {
    const chunk =
      unit.chunk === null ? null : `${unit.chunk.index}/${unit.chunk.total}`;
    const key = reviewUnitKey(unit.path, unit.change, chunk);
    expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + 1);
    expectedPaths.set(key, unit.path);
    assignedPaths.add(unit.path);
  }

  const matchedCounts = new Map<string, number>();
  for (const file of opinion.files) {
    const key = reviewUnitKey(file.path, file.change, file.chunk);
    const expected = expectedCounts.get(key) ?? 0;
    const matched = matchedCounts.get(key) ?? 0;
    if (matched >= expected)
      problems.push({
        code: 'file-unassigned',
        path: file.path,
        detail: 'File unit is unassigned or appears more than once.',
      });
    else matchedCounts.set(key, matched + 1);

    if (
      !REVIEW_FILE_RESULTS.has(file.result) ||
      (file.result === 'skipped' &&
        (file.reason === null || file.reason.trim() === ''))
    )
      problems.push({
        code: 'result-invalid',
        path: file.path,
        detail: 'File result or skipped reason is invalid.',
      });
  }
  for (const [key, count] of expectedCounts) {
    const missing = count - (matchedCounts.get(key) ?? 0);
    for (let index = 0; index < missing; index += 1)
      problems.push({
        code: 'file-missing',
        path: expectedPaths.get(key),
        detail: 'Assigned file unit is absent from the opinion.',
      });
  }

  const findingIds = new Set<string>();
  const findingPrefix = `R${options.group}-`;
  for (const finding of opinion.findings) {
    const ordinal = finding.id.startsWith(findingPrefix)
      ? finding.id.slice(findingPrefix.length)
      : '';
    if (!/^\d{3,}$/.test(ordinal) || findingIds.has(finding.id))
      problems.push({
        code: 'finding-id-invalid',
        path: finding.path,
        findingId: finding.id,
        detail: 'Finding ID is malformed or duplicated.',
      });

    findingIds.add(finding.id);
    if (
      !REVIEW_FINDING_SEVERITIES.has(finding.severity) ||
      !REVIEW_FINDING_CATEGORIES.has(finding.category)
    )
      problems.push({
        code: 'enum-invalid',
        path: finding.path,
        findingId: finding.id,
        detail: 'Finding severity or category is not recognized.',
      });

    if (!assignedPaths.has(finding.path))
      problems.push({
        code: 'path-unassigned',
        path: finding.path,
        findingId: finding.id,
        detail: 'Finding path is not assigned to the review group.',
      });

    const requiredFields = [
      ['existingCode', finding.existingCode],
      ['rule', finding.rule],
      ['message', finding.message],
      ['evidence', finding.evidence],
      ['consequence', finding.consequence],
      ['recommendedAction', finding.recommendedAction],
    ] as const;
    for (const [field, value] of requiredFields)
      if (value.trim() === '')
        problems.push({
          code: 'field-empty',
          path: finding.path,
          findingId: finding.id,
          detail: `${field} must not be blank.`,
        });
  }

  for (const gap of opinion.gaps) {
    const requiredFields = [
      ['path', gap.path],
      ['rule', gap.rule],
      ['detail', gap.detail],
    ] as const;
    for (const [field, value] of requiredFields)
      if (value.trim() === '')
        problems.push({
          code: 'field-empty',
          path: gap.path || undefined,
          detail: `Gap ${field} must not be blank.`,
        });
  }
  if (opinion.state === 'INDETERMINATE' && opinion.gaps.length === 0)
    problems.push({
      code: 'gap-required',
      detail: 'An indeterminate opinion must record at least one gap.',
    });

  if (opinion.riskPlan !== null && opinion.riskPlan.trim() === '')
    problems.push({
      code: 'field-empty',
      detail: 'A present risk plan must not be blank.',
    });

  return problems;
}
