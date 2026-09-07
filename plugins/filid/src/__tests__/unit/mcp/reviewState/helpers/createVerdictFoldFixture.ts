import type { foldReviewVerdict } from '../../../../../mcp/tools/reviewState/verdict/foldReviewVerdict.js';

/** Input accepted by the pure review-verdict fold. */
type FoldReviewVerdictInput = Parameters<typeof foldReviewVerdict>[0];

/**
 * Build a trusted fold input with one canonical FCA candidate and no actor decisions.
 *
 * @returns Complete evidence whose candidate is confirmed by the deterministic fold.
 */
export function createVerdictFoldFixture(): FoldReviewVerdictInput {
  return {
    evidence: {
      sourceHash: 'source-hash',
      snapshotHash: 'snapshot-hash',
      evidenceComplete: true,
      structureStatus: 'ok',
      verificationStatus: 'ok',
      worktree: 'clean',
    },
    files: [
      {
        path: 'src/a.ts',
        change: 'M',
        insertions: 3,
        deletions: 1,
        binary: false,
        role: 'source',
        owner: 'src',
        skipReason: null,
        rules: ['DEF-1'],
        repositoryRules: [],
      },
      {
        path: 'README.md',
        change: 'M',
        insertions: 1,
        deletions: 0,
        binary: false,
        role: 'document',
        owner: null,
        skipReason: 'document-only',
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
        severity: 'error',
        path: 'src/a.ts',
        rule: 'FCA-1',
        message: 'The source may cross a boundary.',
      },
    ],
    informational: [],
    groups: [
      {
        group: {
          id: '01',
          units: [
            {
              path: 'src/a.ts',
              change: 'M',
              chunk: null,
              churn: 4,
              hunks: [{ oldStart: 1, oldEnd: 2, newStart: 1, newEnd: 4 }],
              diffPath: 'diffs/01-src-a-ts.diff',
            },
          ],
          churn: 4,
          planRequired: false,
          dependsOn: [],
          candidateIds: ['FCA-001'],
          briefPath: 'briefs/review-01.md',
          skeletonPath: 'opinions/review-01-round-1.json',
          opinionPath: 'opinions/review-01.json',
          verifyBriefPath: 'briefs/verify-01.md',
          verifyPath: 'opinions/verify-01.json',
          rounds: 1,
          validated: { review: null, verify: null },
        },
        review: {
          schema: 7,
          group: '01',
          round: 1,
          state: 'COMPLETE',
          sourceHash: 'source-hash',
          files: [
            {
              path: 'src/a.ts',
              change: 'M',
              chunk: null,
              result: 'reviewed',
              reason: null,
            },
          ],
          findings: [],
          checked: ['src/a.ts', 'FCA-001'],
          gaps: [],
          riskPlan: null,
        },
        verify: {
          schema: 7,
          group: '01',
          state: 'COMPLETE',
          sourceHash: 'source-hash',
          decisions: [],
          observations: [],
          checked: ['src/a.ts', 'FCA-001'],
        },
        issues: [],
      },
    ],
  };
}
