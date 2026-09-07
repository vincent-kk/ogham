import { describe, expect, it } from 'vitest';

import { applyMissingTestRules } from '../../../../mcp/tools/reviewState/handlers/utils/applyMissingTestRules.js';
import type { LoadedReviewRule } from '../../../../mcp/tools/reviewState/rules/reviewRuleTypes.js';
import type { ReviewGroup } from '../../../../mcp/tools/reviewState/state/reviewGroupTypes.js';
import type { ReviewScopeFile } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/** Built-in rules in their rule-map declaration order. */
const ACTIVE_RULES: readonly LoadedReviewRule[] = [
  { id: 'default', always: true, file: 'default.md', body: 'default' },
  {
    id: 'tests',
    when: 'role:verification',
    file: 'tests.md',
    body: 'tests',
  },
  { id: 'fca', when: 'owner', file: 'fca.md', body: 'fca' },
  {
    id: 'ecmascript',
    match: ['**/*.ts'],
    file: 'lang/ecmascript.md',
    body: 'ecmascript',
  },
];

/** Source row initially selected without the tests rule. */
const SOURCE_FILE: ReviewScopeFile = {
  path: 'src/value.ts',
  change: 'M',
  insertions: 1,
  deletions: 0,
  binary: false,
  role: 'source',
  owner: 'src',
  skipReason: null,
  rules: ['default', 'fca', 'ecmascript'],
  repositoryRules: [],
};

/** Review group with no co-located verification change. */
const SOURCE_ONLY_GROUP: ReviewGroup = {
  id: '01',
  units: [
    {
      path: SOURCE_FILE.path,
      change: SOURCE_FILE.change,
      chunk: null,
      churn: 1,
      hunks: [{ oldStart: 1, oldEnd: 1, newStart: 1, newEnd: 1 }],
      diffPath: 'diffs/01/01-value.ts.diff',
    },
  ],
  churn: 1,
  planRequired: false,
  dependsOn: [],
  candidateIds: [],
  briefPath: 'briefs/review-01.md',
  skeletonPath: 'opinions/review-01.r1.json',
  opinionPath: 'opinions/review-01.json',
  verifyBriefPath: 'briefs/verify-01.md',
  verifyPath: 'opinions/verify-01.json',
  rounds: 1,
  validated: { review: null, verify: null },
};

describe('applyMissingTestRules', () => {
  it('inserts tests at its built-in rule-map declaration position', () => {
    const files = applyMissingTestRules({
      files: [SOURCE_FILE],
      groups: [SOURCE_ONLY_GROUP],
      activeRules: ACTIVE_RULES,
    });

    expect(files[0]?.rules).toEqual(['default', 'tests', 'fca', 'ecmascript']);
  });
});
