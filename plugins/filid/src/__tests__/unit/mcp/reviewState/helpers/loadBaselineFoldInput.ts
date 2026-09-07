import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../../../../../mcp/tools/reviewState/hash/computeReviewArtifactHash.js';
import type { ReviewOpinion } from '../../../../../mcp/tools/reviewState/opinion/reviewOpinionTypes.js';
import type { VerifyOpinion } from '../../../../../mcp/tools/reviewState/opinion/verifyOpinionTypes.js';
import type { ReviewStateRecord } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import type { FoldReviewVerdictInput } from '../../../../../mcp/tools/reviewState/verdict/reviewVerdictTypes.js';

/**
 * Read a preserved v7 run and adapt its trusted opinions for the pure fold.
 * @param directory Absolute baseline run directory containing state and original opinions.
 * @returns Relocated scope and hash-verified artifacts with FCA decisions removed from a copy.
 * @throws When an original review hash, verify hash, or reviewSha256 binding differs.
 */
export function loadBaselineFoldInput(
  directory: string,
): FoldReviewVerdictInput {
  const fixtureRoot = portableJoin(directory, 'fixture');
  const state = JSON.parse(
    readFileSync(
      portableJoin(directory, 'review-state.json'),
      'utf8',
    ).replaceAll('<PROJECT_ROOT>', JSON.stringify(fixtureRoot).slice(1, -1)),
  ) as ReviewStateRecord;
  assert.equal(state.projectRoot, fixtureRoot);
  const groups = state.groups.map((group) => {
    const reviewBytes = readFileSync(
      portableJoin(directory, group.opinionPath),
      'utf8',
    );
    const verifyBytes = readFileSync(
      portableJoin(directory, group.verifyPath),
      'utf8',
    );
    assert.equal(
      group.validated.review?.complete,
      true,
      'baseline review is incomplete',
    );
    assert.equal(
      computeReviewArtifactHash(reviewBytes),
      group.validated.review?.sha256,
      'baseline review sha256',
    );
    assert.equal(
      computeReviewArtifactHash(verifyBytes),
      group.validated.verify?.sha256,
      'baseline verify sha256',
    );
    assert.equal(
      group.validated.verify?.reviewSha256,
      group.validated.review?.sha256,
      'baseline reviewSha256 binding',
    );
    const review = JSON.parse(reviewBytes) as ReviewOpinion;
    const originalVerify = JSON.parse(verifyBytes) as VerifyOpinion;
    const verify = structuredClone(originalVerify);
    verify.decisions = verify.decisions.filter(
      ({ findingId }) => !findingId.startsWith('FCA-'),
    );
    return { group, review, verify, issues: [] };
  });
  return {
    evidence: {
      sourceHash: state.sourceHash,
      snapshotHash: state.scope.snapshotHash,
      evidenceComplete: state.scope.evidenceComplete,
      structureStatus: state.scope.statuses.structure,
      verificationStatus: state.scope.statuses.verification,
      worktree: state.scope.worktree,
    },
    files: state.scope.files,
    candidates: state.scope.candidates,
    informational: state.scope.informational,
    groups,
  };
}
