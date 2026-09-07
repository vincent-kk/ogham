import { existsSync, readFileSync, rmSync } from 'node:fs';

import { portableJoin, writeFileAtomicallySync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import type { ReviewPreparePayload } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildReviewStateSealFinding } from './helpers/buildReviewStateSealFinding.js';
import { buildVerifyOpinion } from './helpers/buildVerifyOpinion.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { prepareCandidateOnlyReviewState } from './helpers/prepareCandidateOnlyReviewState.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Isolated repository and prepared response shared by recovery cases. */
let fixture: ReviewStateSealFixture;
/** Initial response whose paths remain stable while validations advance. */
let prepared: ReviewPreparePayload;

beforeEach(async () => {
  fixture = createReviewStateSealFixture();
  prepared = await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    effort: 'high',
  });
  for (const round of [1, 2]) {
    const state = readPreparedReviewState(prepared);
    const group = state.groups[0]!;
    const opinion = {
      ...buildReviewOpinion(state, group, round),
      findings: [
        { ...buildReviewStateSealFinding(group.id), rule: `DEF-${round}` },
      ],
    };
    writeFileAtomicallySync(
      portableJoin(
        prepared.data.reviewDirectory,
        `opinions/review-01.r${round}.json`,
      ),
      JSON.stringify(opinion),
    );
    const result = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: '01',
      round,
    });
    expect(result.summary.ok).toBe(true);
  }
});

afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('recoverReviewGroups through prepare', () => {
  it('preserves trusted verify bytes when sequential replay internally auto-verifies', async () => {
    const state = readPreparedReviewState(prepared);
    const group = state.groups[0]!;
    writeFileAtomicallySync(
      portableJoin(prepared.data.reviewDirectory, group.skeletonPath),
      JSON.stringify(buildReviewOpinion(state, group, 1)),
    );
    await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    const verifyPath = portableJoin(
      prepared.data.reviewDirectory,
      group.verifyPath,
    );
    const verifyBytes = JSON.stringify({
      ...buildVerifyOpinion(state, group.id, []),
      observations: [
        {
          path: 'src/value.ts',
          detail: 'Keep this verdict-neutral observation.',
        },
      ],
    });
    writeFileAtomicallySync(verifyPath, verifyBytes);
    const verified = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'verify',
      group: group.id,
    });
    expect(verified.summary).toMatchObject({ ok: true });
    const binding =
      readPreparedReviewState(prepared).groups[0]!.validated.verify;
    rmSync(portableJoin(prepared.data.reviewDirectory, group.opinionPath));
    const restored = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(readFileSync(verifyPath, 'utf8')).toBe(verifyBytes);
    expect(restored.data.groups[0]!.validated.verify).toEqual(binding);
    expect(restored.data).toMatchObject({ next: [], sealReady: true });
  });

  it('repairs a tampered rounds-0 merged opinion so planNextHandoffs is seal-ready', async () => {
    const zero = await prepareCandidateOnlyReviewState(fixture);
    const group = zero.data.groups[0]!;
    const path = portableJoin(zero.data.reviewDirectory, group.opinionPath);
    const canonical = readFileSync(path, 'utf8');
    writeFileAtomicallySync(path, canonical + '\n');
    const restored = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    expect(readFileSync(path, 'utf8')).toBe(canonical);
    expect(restored.data.groups[0]!.validated.review).toEqual(
      group.validated.review,
    );
    expect({
      next: restored.data.next,
      sealReady: restored.data.sealReady,
    }).toEqual({ next: [], sealReady: true });
  });

  it('repairs noncanonical rounds-0 bytes without review validation through prepare', async () => {
    const zero = await prepareCandidateOnlyReviewState(fixture);
    const state = readPreparedReviewState(zero);
    const group = state.groups[0]!;
    const path = portableJoin(zero.data.reviewDirectory, group.opinionPath);
    const canonical = readFileSync(path, 'utf8');
    writeFileAtomicallySync(path, canonical + '\n');
    group.validated = { review: null, verify: null };
    writeFileAtomicallySync(zero.data.statePath, JSON.stringify(state));

    const restored = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });

    expect(restored.data).toMatchObject({ next: [], sealReady: true });
    expect(readFileSync(path, 'utf8')).toBe(canonical);
    expect(restored.data.groups[0]!.validated.review).toMatchObject({
      round: 0,
      complete: true,
    });
  });

  it('restores a missing next-round skeleton and preserves an existing unvalidated draft', async () => {
    const path = portableJoin(
      prepared.data.reviewDirectory,
      'opinions/review-01.r3.json',
    );
    rmSync(path);
    const restored = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject({
      round: 3,
      state: 'INDETERMINATE',
    });
    expect(restored.data.next[0]).toMatchObject({ kind: 'review', round: 3 });
    const state = readPreparedReviewState(prepared);
    const draft = JSON.stringify(
      buildReviewOpinion(state, state.groups[0]!, 3),
    );
    writeFileAtomicallySync(path, draft);
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(readFileSync(path, 'utf8')).toBe(draft);
  });

  it('rebuilds a missing verify brief from a trusted complete merged opinion', async () => {
    const state = readPreparedReviewState(prepared);
    const group = state.groups[0]!;
    writeFileAtomicallySync(
      portableJoin(prepared.data.reviewDirectory, 'opinions/review-01.r3.json'),
      JSON.stringify(buildReviewOpinion(state, group, 3)),
    );
    await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: '01',
      round: 3,
    });
    const path = portableJoin(
      prepared.data.reviewDirectory,
      group.verifyBriefPath,
    );
    rmSync(path);
    const restored = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(restored.data.next[0]).toMatchObject({
      kind: 'verify',
      briefPath: path,
    });
    const brief = readFileSync(path, 'utf8');
    expect(brief).toContain('R01-001');
    expect(brief).toContain('R01-002');
    expect(brief).toContain('## Deliverable');
  });

  it.each(['missing', 'tampered'] as const)(
    'replays r1..r2 for an incomplete round 2 when the merged artifact is %s',
    async (damage) => {
      const path = portableJoin(
        prepared.data.reviewDirectory,
        'opinions/review-01.json',
      );
      const merged = readFileSync(path, 'utf8');
      const r2 = readFileSync(
        portableJoin(
          prepared.data.reviewDirectory,
          'opinions/review-01.r2.json',
        ),
        'utf8',
      );
      if (damage === 'missing') rmSync(path);
      else writeFileAtomicallySync(path, merged + '\n');
      const resumed = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'high',
      });
      expect(readFileSync(path, 'utf8')).toBe(merged);
      expect(
        readFileSync(
          portableJoin(
            prepared.data.reviewDirectory,
            'opinions/review-01.r2.json',
          ),
          'utf8',
        ),
      ).toBe(r2);
      expect(resumed.data.groups[0]!.validated.review).toMatchObject({
        round: 2,
        complete: false,
      });
      expect(resumed.data.next[0]).toMatchObject({ kind: 'review', round: 3 });
    },
  );

  it.each([1, 2])(
    'restarts at r1 when raw round %i is absent',
    async (round) => {
      const mergedPath = portableJoin(
        prepared.data.reviewDirectory,
        'opinions/review-01.json',
      );
      rmSync(mergedPath);
      rmSync(
        portableJoin(
          prepared.data.reviewDirectory,
          `opinions/review-01.r${round}.json`,
        ),
      );
      const resumed = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'high',
      });
      expect(resumed.data.groups[0]!.validated).toEqual({
        review: null,
        verify: null,
      });
      expect(existsSync(mergedPath)).toBe(false);
      expect(resumed.data.next[0]).toMatchObject({
        kind: 'review',
        round: 1,
        priorOpinionPath: null,
      });
      expect(
        JSON.parse(
          readFileSync(
            portableJoin(
              prepared.data.reviewDirectory,
              'opinions/review-01.r1.json',
            ),
            'utf8',
          ),
        ),
      ).toMatchObject({ round: 1, state: 'INDETERMINATE' });
    },
  );

  it('preserves verify binding when replay restores identical merged bytes and invalidates it when bytes change', async () => {
    let state = readPreparedReviewState(prepared);
    let group = state.groups[0]!;
    writeFileAtomicallySync(
      portableJoin(prepared.data.reviewDirectory, 'opinions/review-01.r3.json'),
      JSON.stringify(buildReviewOpinion(state, group, 3)),
    );
    await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: '01',
      round: 3,
    });
    state = readPreparedReviewState(prepared);
    group = state.groups[0]!;
    const verifyPath = portableJoin(
      prepared.data.reviewDirectory,
      group.verifyPath,
    );
    const opinion = buildVerifyOpinion(
      state,
      '01',
      ['R01-001', 'R01-002'].map((findingId) => ({
        findingId,
        verdict: 'CONFIRMED',
        evidence: 'src/value.ts:1',
        reason: 'The exported value is wrong.',
      })),
    );
    writeFileAtomicallySync(verifyPath, JSON.stringify(opinion));
    await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'verify',
      group: '01',
    });
    const binding =
      readPreparedReviewState(prepared).groups[0]!.validated.verify;
    const mergedPath = portableJoin(
      prepared.data.reviewDirectory,
      group.opinionPath,
    );
    rmSync(mergedPath);
    const restored = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(restored.data.groups[0]!.validated.verify).toEqual(binding);
    expect(restored.data).toMatchObject({ next: [], sealReady: true });
    const rawPath = portableJoin(
      prepared.data.reviewDirectory,
      'opinions/review-01.r1.json',
    );
    const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
    raw.findings[0].message = 'A different defect claim.';
    writeFileAtomicallySync(rawPath, JSON.stringify(raw));
    rmSync(mergedPath);
    const changed = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(changed.data.groups[0]!.validated.verify).toBeNull();
    expect(changed.data.next[0]).toMatchObject({ kind: 'verify' });
    expect(changed.data.sealReady).toBe(false);
  });

  it('keeps checkpoint read-only and repairs a tampered auto-verify only in prepare', async () => {
    const state = readPreparedReviewState(prepared);
    const group = state.groups[0]!;
    const cleanRound = buildReviewOpinion(state, group);
    writeFileAtomicallySync(
      portableJoin(prepared.data.reviewDirectory, group.skeletonPath),
      JSON.stringify(cleanRound),
    );
    await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: '01',
      round: 1,
    });
    const recovered = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(recovered.data).toMatchObject({ next: [], sealReady: true });
    const verifyPath = portableJoin(
      prepared.data.reviewDirectory,
      group.verifyPath,
    );
    const original = readFileSync(verifyPath, 'utf8');
    writeFileAtomicallySync(verifyPath, original + '\n');
    const stateBytes = readFileSync(prepared.data.statePath, 'utf8');
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    expect(checkpoint.data.sealReady).toBe(false);
    expect(readFileSync(verifyPath, 'utf8')).toBe(original + '\n');
    expect(readFileSync(prepared.data.statePath, 'utf8')).toBe(stateBytes);
    const repaired = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'high',
    });
    expect(repaired.data).toMatchObject({ next: [], sealReady: true });
    expect(readFileSync(verifyPath, 'utf8')).toBe(original);
  });
});
