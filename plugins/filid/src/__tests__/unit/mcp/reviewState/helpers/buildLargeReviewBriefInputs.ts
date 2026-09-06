import { readFileSync } from 'node:fs';

import type { RenderReviewBriefInput } from '../../../../../mcp/tools/reviewState/brief/reviewBriefTypes.js';
import { buildReviewGroups } from '../../../../../mcp/tools/reviewState/group/buildReviewGroups.js';

import { buildReviewBriefInput } from './buildReviewBriefInput.js';

/**
 * Build 46 deterministic 14-unit groups with canonical review rules and method.
 * @returns Large synthetic brief inputs excluding provider-dependent source reads.
 */
export function buildLargeReviewBriefInputs(): RenderReviewBriefInput[] {
  const seed = buildReviewBriefInput();
  const units = Array.from({ length: 644 }, (_, index) => ({
    ...seed.group.units[0]!,
    path: `src/feature${String(index).padStart(4, '0')}.ts`,
    churn: 60,
  }));
  const files = units.map((unit) => ({
    ...seed.files[0]!,
    path: unit.path,
    insertions: 60,
    deletions: 0,
  }));
  const groups = buildReviewGroups({
    units,
    files,
    candidates: [],
    rounds: 2,
    groupFileLimit: 14,
    groupChurnLimit: 1024,
    planChurnLimit: 50,
  });
  const reviewerMethod = readFileSync(
    new URL(
      '../../../../../../skills/cross-review/reviewers/reviewer.md',
      import.meta.url,
    ),
    'utf8',
  );
  const rules = ['default', 'fca', 'tests'].map((id) => ({
    id,
    body: readFileSync(
      new URL(
        `../../../../../../skills/cross-review/rules/${id}.md`,
        import.meta.url,
      ),
      'utf8',
    ),
  }));
  return groups.map((group) => ({
    ...seed,
    reviewerMethod,
    rules,
    files,
    group,
    candidates: [],
    diffs: null,
  }));
}
