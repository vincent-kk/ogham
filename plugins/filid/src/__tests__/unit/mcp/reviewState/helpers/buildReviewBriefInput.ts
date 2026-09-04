import type { RenderReviewBriefInput } from '../../../../../mcp/tools/reviewState/brief/reviewBriefTypes.js';

/**
 * Build a reviewer-brief fixture with unchunked, chunked, and skipped roster rows.
 * @returns Complete deterministic reviewer-brief input.
 */
export function buildReviewBriefInput(): RenderReviewBriefInput {
  return {
    group: {
      id: '01',
      units: [
        {
          path: 'src/a.ts',
          change: 'M',
          chunk: null,
          churn: 3,
          hunks: [{ oldStart: 4, oldEnd: 5, newStart: 4, newEnd: 6 }],
          diffPath: 'diffs/01/01-a.ts.diff',
        },
        {
          path: 'src/b.ts',
          change: 'M',
          chunk: { index: 2, total: 3 },
          churn: 8,
          hunks: [{ oldStart: 10, oldEnd: 13, newStart: 10, newEnd: 14 }],
          diffPath: 'diffs/01/02-b.ts.2-of-3.diff',
        },
      ],
      churn: 11,
      planRequired: false,
      dependsOn: [],
      candidateIds: ['FCA-001'],
      briefPath: 'briefs/review-01.md',
      skeletonPath: 'opinions/review-01.r1.json',
      opinionPath: 'opinions/review-01.json',
      verifyBriefPath: 'briefs/verify-01.md',
      verifyPath: 'opinions/verify-01.json',
      rounds: 2,
      validated: { review: null, verify: null },
    },
    files: [
      {
        path: 'src/a.ts',
        change: 'M',
        insertions: 2,
        deletions: 1,
        binary: false,
        role: 'source',
        owner: 'src',
        skipReason: null,
        rules: ['default'],
        repositoryRules: [],
      },
      {
        path: 'src/b.ts',
        change: 'M',
        insertions: 12,
        deletions: 9,
        binary: false,
        role: 'source',
        owner: 'src',
        skipReason: null,
        rules: ['default'],
        repositoryRules: [],
      },
      {
        path: 'public/generated.js',
        change: 'M',
        insertions: 1,
        deletions: 1,
        binary: false,
        role: 'generated',
        owner: null,
        skipReason: 'generated path',
        rules: [],
        repositoryRules: [],
      },
    ],
    candidates: [
      {
        id: 'FCA-001',
        source: 'structure',
        scope: 'src',
        category: 'structure',
        severity: 'warning',
        path: 'src/a.ts',
        rule: 'boundary-import',
        message: 'The changed import may cross its owning boundary.',
      },
    ],
    repositoryRules: ['.filid/review.md'],
    rules: [{ id: 'default', body: 'Review every assigned unit.' }],
    sourceHash: 'source-hash-v7',
    baseRef: 'main',
  };
}
