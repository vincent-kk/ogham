import { readFileSync, rmSync } from 'node:fs';

import { portableJoin, writeFileAtomicallySync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import type { ReviewPreparePayload } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildVerifyOpinion } from './helpers/buildVerifyOpinion.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Fresh rounds isolate automatic verification recovery from earlier findings. */
let fixture: ReturnType<typeof createReviewStateSealFixture>;
/** Prepared paths shared with the recovery action. */
let prepared: ReviewPreparePayload;
beforeEach(async () => {
  fixture = createReviewStateSealFixture();
  prepared = await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    effort: 'high',
  });
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('recover automatic verification through prepare', () => {
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
