import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { RenderReviewBriefInput } from '../../../../../mcp/tools/reviewState/brief/reviewBriefTypes.js';
import { buildReviewGroups } from '../../../../../mcp/tools/reviewState/group/buildReviewGroups.js';
import { loadRuleMap } from '../../../../../mcp/tools/reviewState/rules/loadRuleMap.js';
import { resolveFileRules } from '../../../../../mcp/tools/reviewState/rules/resolveFileRules.js';

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
  const ruleMap = loadRuleMap(
    fileURLToPath(new URL('../../../../../../', import.meta.url)),
  );
  const selected = files.flatMap((file) =>
    resolveFileRules({ file, rules: ruleMap, overrides: [] }),
  );
  const rules = ruleMap.filter((rule) => selected.includes(rule.id));
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
