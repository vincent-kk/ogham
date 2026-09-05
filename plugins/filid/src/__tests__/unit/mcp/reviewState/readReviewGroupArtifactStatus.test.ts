import { mkdtempSync, rmSync } from 'node:fs';

import {
  portableJoin,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readReviewGroupArtifactStatus } from '../../../../mcp/tools/reviewState/handoff/readReviewGroupArtifactStatus.js';
import { computeReviewArtifactHash } from '../../../../mcp/tools/reviewState/hash/computeReviewArtifactHash.js';

import { buildReviewHandoffFixture } from './helpers/buildReviewHandoffFixture.js';
import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildVerifyOpinion } from './helpers/buildVerifyOpinion.js';
import { writeReviewStateFixtureFile } from './helpers/writeReviewStateFixtureFile.js';

/** Isolated filesystem root for artifact trust observations. */
let root: string;

beforeEach(() => {
  root = mkdtempSync(portableJoin(tmp(), 'handoff-status-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('readReviewGroupArtifactStatus', () => {
  it.each([
    'trusted',
    'verify-tampered',
    'review-mismatch',
    'verify-missing',
    'review-tampered',
  ] as const)(
    'observes %s from exact bytes and validation hashes',
    (scenario) => {
      const { state, paths } = buildReviewHandoffFixture(root);
      const group = state.groups[0]!;
      const review = JSON.stringify(buildReviewOpinion(state, group));
      const verify = JSON.stringify(buildVerifyOpinion(state, group.id, []));
      writeReviewStateFixtureFile(
        paths.reviewDirectory,
        group.opinionPath,
        review,
      );
      writeReviewStateFixtureFile(
        paths.reviewDirectory,
        group.verifyPath,
        verify,
      );
      writeReviewStateFixtureFile(
        paths.reviewDirectory,
        group.skeletonPath,
        review,
      );
      writeReviewStateFixtureFile(
        paths.reviewDirectory,
        'opinions/review-01.r2.json',
        review,
      );
      writeReviewStateFixtureFile(
        paths.reviewDirectory,
        group.briefPath,
        'review brief',
      );
      writeReviewStateFixtureFile(
        paths.reviewDirectory,
        group.verifyBriefPath,
        'verify brief',
      );
      group.validated = {
        review: {
          round: 1,
          complete: true,
          sha256: computeReviewArtifactHash(review),
        },
        verify: {
          sha256: computeReviewArtifactHash(verify),
          reviewSha256: computeReviewArtifactHash(review),
        },
      };
      if (scenario === 'verify-tampered')
        writeFileAtomicallySync(
          portableJoin(paths.reviewDirectory, group.verifyPath),
          verify + '\n',
        );
      if (scenario === 'review-mismatch')
        group.validated.verify!.reviewSha256 = 'another-review';
      if (scenario === 'verify-missing')
        rmSync(portableJoin(paths.reviewDirectory, group.verifyPath));
      if (scenario === 'review-tampered')
        writeFileAtomicallySync(
          portableJoin(paths.reviewDirectory, group.opinionPath),
          review + '\n',
        );
      const [status] = readReviewGroupArtifactStatus(state, paths);
      expect(status).toMatchObject({
        group: '01',
        review: scenario === 'review-tampered' ? 'invalid' : 'trusted',
        verify: [
          'verify-tampered',
          'review-mismatch',
          'verify-missing',
        ].includes(scenario)
          ? 'invalid'
          : 'trusted',
        roundFiles: [1, 2],
        assignedCount: scenario === 'review-tampered' ? null : 0,
        briefPresent: true,
        verifyBriefPresent: true,
      });
    },
  );

  it('reports missing trust when no validation exists even if files exist', () => {
    const { state, paths } = buildReviewHandoffFixture(root);
    writeReviewStateFixtureFile(
      paths.reviewDirectory,
      state.groups[0]!.opinionPath,
      '{}',
    );
    expect(readReviewGroupArtifactStatus(state, paths)[0]).toMatchObject({
      review: 'missing',
      verify: 'missing',
      roundFiles: [],
      assignedCount: null,
      briefPresent: false,
      verifyBriefPresent: false,
    });
  });
});
