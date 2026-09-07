import { mkdtempSync, rmSync } from 'node:fs';

import {
  portableJoin,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { REVIEW_STATE_ERROR_MESSAGES } from '../../../../constants/reviewState.js';
import { readReviewState } from '../../../../mcp/tools/reviewState/state/readReviewState.js';

/** Temporary directory that owns the state fixture for one test. */
let stateDirectory: string;

/** State fixture path read by the unit under test. */
let statePath: string;

/** Complete v2 record with nested scope and group data. */
const VALID_V2_STATE = {
  schemaVersion: 2,
  projectRoot: '/project',
  branchName: 'feature/review-state-v2',
  normalizedBranch: 'feature-review-state-v2',
  baseRef: 'main',
  baseCommit: 'base-commit',
  sourceHash: 'source-hash',
  fileHashes: { 'src/value.ts': 'blob-hash' },
  phase: 'prepared',
  preparedAt: '2026-09-04T00:00:00.000Z',
  effort: 'high',
  groups: [
    {
      id: '01',
      units: [
        {
          path: 'src/value.ts',
          change: 'M',
          chunk: { index: 1, total: 2 },
          churn: 3,
          hunks: [{ oldStart: 4, oldEnd: 5, newStart: 4, newEnd: 6 }],
          diffPath: 'diffs/01/01-value.ts.1-of-2.diff',
        },
      ],
      churn: 3,
      planRequired: false,
      dependsOn: [],
      candidateIds: ['FCA-001'],
      briefPath: 'briefs/review-01.md',
      skeletonPath: 'opinions/review-01.r1.json',
      opinionPath: 'opinions/review-01.json',
      verifyBriefPath: 'briefs/verify-01.md',
      verifyPath: 'opinions/verify-01.json',
      rounds: 3,
      validated: {
        review: {
          round: 1,
          sha256:
            '1111111111111111111111111111111111111111111111111111111111111111',
          complete: true,
        },
        verify: {
          sha256:
            '2222222222222222222222222222222222222222222222222222222222222222',
          reviewSha256:
            '1111111111111111111111111111111111111111111111111111111111111111',
        },
      },
    },
  ],
  scope: {
    snapshotHash: 'snapshot-hash',
    evidenceComplete: true,
    worktree: 'clean',
    dirtyPaths: [],
    statuses: { structure: 'ok', verification: 'ok' },
    files: [
      {
        path: 'src/value.ts',
        change: 'M',
        insertions: 2,
        deletions: 1,
        binary: false,
        role: 'source',
        owner: 'src',
        skipReason: null,
        rules: ['default', 'ecmascript'],
        repositoryRules: ['.filid/review-typescript.md'],
      },
    ],
    candidates: [
      {
        id: 'FCA-001',
        source: 'structure',
        scope: 'src',
        category: 'structure',
        severity: 'warning',
        path: 'src/value.ts',
        rule: 'boundary-import',
        message: 'The changed import crosses the module boundary.',
      },
    ],
    informational: [
      {
        source: 'verification',
        scope: 'src',
        category: 'verification',
        severity: 'info',
        path: 'src/value.test.ts',
        rule: 'verification-role',
        message: 'The related test remains a verification record.',
      },
    ],
    outOfScopeCount: 0,
    infoCount: 1,
  },
  verdict: null,
};

/**
 * Write one JSON state fixture to the active test path.
 *
 * @param value JSON-serializable state candidate consumed by readReviewState.
 * @returns Nothing.
 */
function writeState(value: unknown): void {
  writeFileAtomicallySync(statePath, `${JSON.stringify(value)}\n`);
}

beforeEach(() => {
  stateDirectory = mkdtempSync(portableJoin(tmp(), 'filid-review-state-read-'));
  statePath = portableJoin(stateDirectory, 'state.json');
});

afterEach(() => {
  rmSync(stateDirectory, { recursive: true, force: true });
});

describe('readReviewState', () => {
  it('returns schema-mismatch for a v1 record', () => {
    writeState({
      schemaVersion: 1,
      projectRoot: '/project',
      branchName: 'feature/review-state-v1',
      normalizedBranch: 'feature-review-state-v1',
      baseRef: 'main',
      baseCommit: 'base-commit',
      sourceHash: 'source-hash',
      fileHashes: { 'src/value.ts': 'blob-hash' },
      phase: 'prepared',
      preparedAt: '2026-09-04T00:00:00.000Z',
    });

    expect(readReviewState(statePath)).toEqual({ kind: 'schema-mismatch' });
  });

  it('rejects a malformed nested v2 record as STATE_INVALID', () => {
    writeState({
      ...VALID_V2_STATE,
      groups: [
        {
          ...VALID_V2_STATE.groups[0],
          units: [
            {
              ...VALID_V2_STATE.groups[0].units[0],
              hunks: [
                {
                  ...VALID_V2_STATE.groups[0].units[0].hunks[0],
                  newStart: 'not-a-line-number',
                },
              ],
            },
          ],
        },
      ],
    });

    expect(() => readReviewState(statePath)).toThrow(
      `${REVIEW_STATE_ERROR_MESSAGES.STATE_INVALID}: ${statePath}`,
    );
  });

  it.each([
    ['briefPath', 'briefs/review-02.md'],
    ['skeletonPath', 'opinions/review-02.r1.json'],
    ['opinionPath', 'opinions/review-02.json'],
    ['verifyBriefPath', 'briefs/verify-02.md'],
    ['verifyPath', 'opinions/verify-02.json'],
  ] as const)(
    'rejects noncanonical %s derived from another group',
    (key, path) => {
      writeState({
        ...VALID_V2_STATE,
        groups: [
          {
            ...VALID_V2_STATE.groups[0],
            [key]: path,
          },
        ],
      });

      expect(() => readReviewState(statePath)).toThrow(
        `${REVIEW_STATE_ERROR_MESSAGES.STATE_INVALID}: ${statePath}`,
      );
    },
  );

  it('rejects a unit diff path outside its canonical group directory', () => {
    writeState({
      ...VALID_V2_STATE,
      groups: [
        {
          ...VALID_V2_STATE.groups[0],
          units: [
            {
              ...VALID_V2_STATE.groups[0].units[0],
              diffPath: 'diffs/02/01-value.ts.1-of-2.diff',
            },
          ],
        },
      ],
    });

    expect(() => readReviewState(statePath)).toThrow(
      `${REVIEW_STATE_ERROR_MESSAGES.STATE_INVALID}: ${statePath}`,
    );
  });

  it.each([
    [
      'prepared state with a verdict',
      { ...VALID_V2_STATE, verdict: 'APPROVED' },
    ],
    [
      'prepared state with a seal timestamp',
      { ...VALID_V2_STATE, sealedAt: '2026-09-04T01:00:00.000Z' },
    ],
    [
      'sealed state without a verdict',
      {
        ...VALID_V2_STATE,
        phase: 'sealed',
        sealedAt: '2026-09-04T01:00:00.000Z',
      },
    ],
    [
      'sealed state without a seal timestamp',
      { ...VALID_V2_STATE, phase: 'sealed', verdict: 'APPROVED' },
    ],
  ])('rejects %s as STATE_INVALID', (_description, value) => {
    writeState(value);

    expect(() => readReviewState(statePath)).toThrow(
      `${REVIEW_STATE_ERROR_MESSAGES.STATE_INVALID}: ${statePath}`,
    );
  });

  it('accepts a complete deeply nested v2 record', () => {
    writeState(VALID_V2_STATE);

    expect(readReviewState(statePath)).toEqual(VALID_V2_STATE);
  });
});
