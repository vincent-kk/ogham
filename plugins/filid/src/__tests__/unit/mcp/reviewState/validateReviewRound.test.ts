import { readFileSync, rmSync } from 'node:fs';

import { portableJoin, writeFileAtomicallySync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { computeReviewArtifactHash } from '../../../../mcp/tools/reviewState/hash/computeReviewArtifactHash.js';
import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { resolveReviewStatePaths } from '../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { writeReviewState } from '../../../../mcp/tools/reviewState/state/writeReviewState.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildReviewStateSealFinding } from './helpers/buildReviewStateSealFinding.js';
import { buildVerifyOpinion } from './helpers/buildVerifyOpinion.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { prepareReviewStateSealFixture } from './helpers/prepareReviewStateSealFixture.js';
import { readPersistedReviewState } from './helpers/readPersistedReviewState.js';

/** Isolated Git repository and actor-method fixture for validation effects. */
let fixture: ReviewStateSealFixture;
/** Prepared source and group identity for the current case. */
let state: ReviewStateRecord;
/** Canonical artifact paths supplied by the prepared identity. */
let paths: ReviewStatePaths;

beforeEach(async () => {
  fixture = createReviewStateSealFixture();
  state = await prepareReviewStateSealFixture(fixture);
  paths = resolveReviewStatePaths(state.projectRoot, state.branchName);
  writeFileAtomicallySync(
    portableJoin(paths.reviewDirectory, state.groups[0]!.skeletonPath),
    JSON.stringify(buildReviewOpinion(state, state.groups[0]!)),
  );
});

afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('validateReviewRound handoff', () => {
  it('auto-verifies zero findings with verifierRequired false and sealReady true', async () => {
    const result = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: '01',
      round: 1,
    });
    expect(result.summary).toMatchObject({ ok: true, nextRound: null });
    expect(result.data).toMatchObject({
      verifierRequired: false,
      next: [],
      sealReady: true,
    });
    const updated = readPersistedReviewState(
      fixture.projectRoot,
      state.normalizedBranch,
    );
    const group = updated.groups[0]!;
    const review = readFileSync(
      portableJoin(paths.reviewDirectory, group.opinionPath),
      'utf8',
    );
    const verify = readFileSync(
      portableJoin(paths.reviewDirectory, group.verifyPath),
      'utf8',
    );
    expect(JSON.parse(verify)).toMatchObject({
      state: 'COMPLETE',
      decisions: [],
      observations: [],
      checked: ['src/value.ts'],
    });
    expect(group.validated.verify).toEqual({
      sha256: computeReviewArtifactHash(verify),
      reviewSha256: computeReviewArtifactHash(review),
    });
  });

  it('assigns FCA-1 reviewer claims, excludes FCA-001 and refuted IDs, and advances verifier handoffs', async () => {
    const group = state.groups[0]!;
    state.scope.candidates.push({
      id: 'FCA-001',
      source: 'structure',
      scope: 'src',
      category: 'structure',
      severity: 'error',
      path: 'src/value.ts',
      rule: 'FCA-1',
      message: 'A canonical boundary finding.',
    });
    group.candidateIds.push('FCA-001');
    writeReviewState(paths.statePath, state);
    const finding = buildReviewStateSealFinding('01');
    writeFileAtomicallySync(
      portableJoin(paths.reviewDirectory, group.skeletonPath),
      JSON.stringify({
        ...buildReviewOpinion(state, group),
        findings: [
          { ...finding, rule: 'FCA-1' },
          {
            ...finding,
            id: 'R01-002',
            existingCode: 'not present in the committed source',
            rule: 'DEF-1',
          },
        ],
      }),
    );
    const reviewed = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: '01',
      round: 1,
    });
    expect(reviewed.data).toMatchObject({
      verifierRequired: true,
      sealReady: false,
    });
    expect(reviewed.data.next).toEqual([
      {
        kind: 'verify',
        group: '01',
        briefPath: portableJoin(paths.reviewDirectory, group.verifyBriefPath),
        outputPath: portableJoin(paths.reviewDirectory, group.verifyPath),
        priorOpinionPath: null,
      },
    ]);
    const brief = readFileSync(
      portableJoin(paths.reviewDirectory, group.verifyBriefPath),
      'utf8',
    );
    expect(brief).toContain('| R01-001 |');
    expect(brief).toContain('FCA-1');
    expect(brief).not.toContain('| FCA-001 |');
    expect(brief).not.toContain('| R01-002 |');
    const assigned = {
      findingId: 'R01-001',
      verdict: 'REFUTED',
      evidence: 'src/value.ts:1',
      reason: 'The reviewer claim does not reproduce.',
    };
    for (const findingId of ['FCA-001', 'R01-002']) {
      writeFileAtomicallySync(
        portableJoin(paths.reviewDirectory, group.verifyPath),
        JSON.stringify(
          buildVerifyOpinion(state, group.id, [
            assigned,
            { ...assigned, findingId },
          ]),
        ),
      );
      const rejected = await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'verify',
        group: '01',
      });
      expect(rejected.summary).toMatchObject({ ok: false });
      expect(rejected.data.problems).toContainEqual(
        expect.objectContaining({ code: 'decision-unknown' }),
      );
      expect(rejected.data.sealReady).toBe(false);
      expect(rejected.data.next).toEqual(reviewed.data.next);
    }
    writeFileAtomicallySync(
      portableJoin(paths.reviewDirectory, group.verifyPath),
      JSON.stringify(buildVerifyOpinion(state, group.id, [assigned])),
    );
    const verified = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'verify',
      group: '01',
    });
    expect(verified.summary).toMatchObject({ ok: true });
    expect(verified.data).toMatchObject({ next: [], sealReady: true });
  });

  it('makes seal distrust a tampered auto-verify artifact', async () => {
    await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: '01',
      round: 1,
    });
    const path = portableJoin(
      paths.reviewDirectory,
      state.groups[0]!.verifyPath,
    );
    writeFileAtomicallySync(path, readFileSync(path, 'utf8') + '\n');
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    expect(sealed.summary).toMatchObject({
      disposition: 'sealed',
      verdict: 'INCONCLUSIVE',
    });
    expect(readFileSync(paths.reportPath, 'utf8')).toContain(
      'artifact modified after validation',
    );
  });
});
