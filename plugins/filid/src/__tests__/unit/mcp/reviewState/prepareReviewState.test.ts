import { readFileSync, rmSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { computeReviewArtifactHash } from '../../../../mcp/tools/reviewState/hash/computeReviewArtifactHash.js';
import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { REVIEW_HANDOFF_SEED_SCHEMA } from '../../../../mcp/tools/reviewState/scope/reviewHandoffSeedSchema.js';

import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { prepareCandidateOnlyReviewState } from './helpers/prepareCandidateOnlyReviewState.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';

/** Isolated Git repository and plugin root for prepare input contracts. */
let fixture: ReviewStateSealFixture;

beforeEach(() => {
  fixture = createReviewStateSealFixture();
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('prepareReviewState optional inputs', () => {
  it('carries valid changeContext handoff claims only into newly written review briefs', async () => {
    const handoff = REVIEW_HANDOFF_SEED_SCHEMA.parse({
      schema: 1,
      snapshotHash: 'snapshot-hash',
      scope: ['.'],
      documentSync: 'committed',
      repaired: 0,
      recorded: [
        {
          class: 'code-change',
          ruleId: 'boundary-import',
          path: '.',
          severity: 'warning',
          certainty: 'exact',
          note: 'Confirm this prepared claim against the tree.',
        },
      ],
      truncated: 0,
    });
    const request = {
      action: 'prepare' as const,
      projectRoot: fixture.projectRoot,
      changeContext: `Human summary\n<!-- filid:handoff v1\n${JSON.stringify(handoff)}\n-->`,
    };
    const prepared = await handleReviewState(request);
    expect(prepared.data.groups.length).toBeGreaterThan(0);
    expect(prepared.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: 'review-handoff-invalid' }),
    );
    for (const group of prepared.data.groups) {
      const path = portableJoin(prepared.data.reviewDirectory, group.briefPath);
      const brief = readFileSync(path, 'utf8');
      expect(brief).toContain('\n## FCA Handoff\n');
      expect(brief).toContain(handoff.recorded[0]!.note);
      expect(brief).not.toContain('<!-- filid:handoff v1');
      rmSync(path);
    }
    const session = readFileSync(prepared.data.sessionPath, 'utf8');
    expect(session).toContain('Human summary');
    expect(session).not.toContain('## FCA Handoff');
    expect(session).not.toContain('<!-- filid:handoff v1');
    expect(
      JSON.parse(readFileSync(prepared.data.statePath, 'utf8')),
    ).not.toHaveProperty('handoff');
    const resumed = await handleReviewState(request);
    expect(resumed.summary.disposition).toBe('resumable');
    expect(resumed.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: 'review-handoff-invalid' }),
    );
    for (const group of resumed.data.groups)
      expect(
        readFileSync(
          portableJoin(resumed.data.reviewDirectory, group.briefPath),
          'utf8',
        ),
      ).toContain('\n## FCA Handoff\n');
    const changedRequest = {
      ...request,
      changeContext: request.changeContext.replace(
        handoff.recorded[0]!.note,
        'Confirm the updated claim against the tree.',
      ),
    };
    const unchanged = await handleReviewState(changedRequest);
    for (const group of unchanged.data.groups)
      expect(
        readFileSync(
          portableJoin(unchanged.data.reviewDirectory, group.briefPath),
          'utf8',
        ),
      ).toContain(handoff.recorded[0]!.note);
    const forced = await handleReviewState({ ...changedRequest, force: true });
    for (const group of forced.data.groups)
      expect(
        readFileSync(
          portableJoin(forced.data.reviewDirectory, group.briefPath),
          'utf8',
        ),
      ).toContain('Confirm the updated claim against the tree.');
  });

  it('normalizes a nested projectRoot and resolves branchName and local main, including checkpoint', async () => {
    const result = await handleReviewState({
      action: 'prepare',
      projectRoot: portableJoin(fixture.projectRoot, 'src'),
    });
    expect(result.data).toMatchObject({
      projectRoot: runReviewStateFixtureGit(fixture.projectRoot, [
        'rev-parse',
        '--show-toplevel',
      ]),
      branchName: fixture.branchName,
      baseRef: 'main',
      sealReady: false,
    });
    expect(result.data.next[0]).toMatchObject({
      kind: 'review',
      group: '01',
      round: 1,
      priorOpinionPath: null,
    });
    expect(readFileSync(result.data.sessionPath, 'utf8')).toMatch(
      /## Change Context[\s\S]*feature[\s\S]*insertions/,
    );
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    expect(checkpoint.data.next).toEqual(result.data.next);
    expect(checkpoint.data.sealReady).toBe(false);
  });

  it('rejects an explicit unknown baseRef without falling back to main', async () => {
    await expect(
      handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        baseRef: 'missing-base',
      }),
    ).rejects.toMatchObject({ code: 'review-base-ref-unresolved' });
  });

  it('prefers remote HEAD over remote candidates and local main', async () => {
    runReviewStateFixtureGit(fixture.projectRoot, [
      'update-ref',
      'refs/remotes/origin/trunk',
      'main',
    ]);
    runReviewStateFixtureGit(fixture.projectRoot, [
      'update-ref',
      'refs/remotes/origin/main',
      'HEAD',
    ]);
    runReviewStateFixtureGit(fixture.projectRoot, [
      'symbolic-ref',
      'refs/remotes/origin/HEAD',
      'refs/remotes/origin/trunk',
    ]);
    const result = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(result.data.baseRef).toBe('origin/trunk');
  });

  it('prefers origin/main over local main when remote HEAD is absent', async () => {
    runReviewStateFixtureGit(fixture.projectRoot, [
      'update-ref',
      'refs/remotes/origin/main',
      'main',
    ]);
    const result = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(result.data.baseRef).toBe('origin/main');
  });

  it('falls back to local master when main is absent', async () => {
    runReviewStateFixtureGit(fixture.projectRoot, [
      'branch',
      '-m',
      'main',
      'master',
    ]);
    const result = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(result.data.baseRef).toBe('master');
  });

  it('reports an unresolved base when every candidate is absent', async () => {
    runReviewStateFixtureGit(fixture.projectRoot, ['branch', '-D', 'main']);
    await expect(
      handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
      }),
    ).rejects.toMatchObject({ code: 'review-base-ref-unresolved' });
  });

  it('reports detached HEAD when branchName is omitted', async () => {
    runReviewStateFixtureGit(fixture.projectRoot, ['checkout', '--detach']);
    await expect(
      handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
      }),
    ).rejects.toMatchObject({ code: 'review-branch-unresolved' });
  });

  it('sanitizes and caps changeContext only when prepare renders artifacts', async () => {
    const request = {
      action: 'prepare' as const,
      projectRoot: fixture.projectRoot,
      changeContext: '\u0000\u0007' + 'x'.repeat(8100),
    };
    const prepared = await handleReviewState(request);
    expect(prepared.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'review-change-context-truncated' }),
    );
    const resumed = await handleReviewState(request);
    expect(resumed.diagnostics).toEqual([]);
    for (const result of [prepared, resumed]) {
      expect(result.status).toBe('ok');
      const session = readFileSync(result.data.sessionPath, 'utf8');
      expect(session).toContain('x'.repeat(8000));
      expect(session).not.toContain('x'.repeat(8001));
      expect(session).not.toContain('\u0000');
      expect(session).not.toContain('\u0007');
    }
  });

  it('auto-verifies a rounds 0 candidate-only group with exact hash binding', async () => {
    const result = await prepareCandidateOnlyReviewState(fixture);
    const group = result.data.groups[0]!;
    expect(group).toMatchObject({ rounds: 0, units: [] });
    const review = readFileSync(
      portableJoin(result.data.reviewDirectory, group.opinionPath),
      'utf8',
    );
    const verify = readFileSync(
      portableJoin(result.data.reviewDirectory, group.verifyPath),
      'utf8',
    );
    expect(JSON.parse(verify)).toMatchObject({
      schema: 7,
      group: '01',
      state: 'COMPLETE',
      sourceHash: result.summary.sourceHash,
      decisions: [],
      observations: [],
      checked: [],
    });
    expect(group.validated.verify).toEqual({
      sha256: computeReviewArtifactHash(verify),
      reviewSha256: computeReviewArtifactHash(review),
    });
    expect(result.data.next).toEqual([]);
    expect(result.data.sealReady).toBe(true);
  });
});
