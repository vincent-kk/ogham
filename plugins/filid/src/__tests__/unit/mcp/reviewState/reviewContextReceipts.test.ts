import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { observeReviewContextReceipt } from '../../../../mcp/tools/reviewState/handlers/utils/observeReviewContextReceipt.js';
import { computeReviewContextToken } from '../../../../mcp/tools/reviewState/handoff/computeReviewContextToken.js';
import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import type {
  ReviewStatePayload,
  ReviewStateRecord,
} from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';

/** Real Git repositories keep receipt assertions independent of mocked source data. */
let fixture: ReviewStateSealFixture;
/** State whose group capability scopes each broker request. */
let state: ReviewStateRecord;
beforeEach(async () => {
  fixture = createReviewStateSealFixture();
  configureReviewGroups(fixture.projectRoot, 2);
  const prepared = await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    effort: 'low',
    changeContext: 'Review assigned changes.',
    actorContext: { mode: 'isolated', userInstructions: '' },
  });
  state = JSON.parse(
    readFileSync(prepared.data.statePath, 'utf8'),
  ) as ReviewStateRecord;
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/**
 * Call the actual context action with one group's capability.
 * @param operation Context operation selected by the actor.
 * @param extra Query or opinion fields for that operation.
 * @returns The broker response, never a fixture-authored receipt.
 */
function context(
  operation: string,
  extra: Record<string, unknown> = {},
): Promise<ReviewStatePayload> {
  return handleReviewState({
    action: 'context',
    projectRoot: fixture.projectRoot,
    generationId: state.generationId,
    group: state.groups[0].id,
    token: computeReviewContextToken(
      state.groups[0].contextToken!,
      'review',
      1,
    ),
    kind: 'review',
    round: 1,
    operation,
    ...extra,
  }) as Promise<ReviewStatePayload>;
}

describe('observed review context broker', () => {
  it('records reads, absence and zero-result search before accepting an opinion', async () => {
    await context('brief');
    const read = await context('read', { path: 'src/value.ts' });
    expect(read.data.context?.text).toContain('value = 2');
    expect(
      (await context('exists', { path: 'src/absent.ts' })).data.context?.text,
    ).toBe('false');
    expect(
      (await context('search', { path: 'src', query: 'no-such-consumer' })).data
        .context?.text,
    ).toBe('');
    const submitted = await context('submit', {
      opinion: buildReviewOpinion(state, state.groups[0]),
    });
    expect(submitted.summary.ok).toBe(true);
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    expect(checkpoint.data.state?.groups[0].contextReceipts).toHaveLength(3);
    expect(checkpoint.data.state?.groups[0].validated.review?.complete).toBe(
      true,
    );
    expect(submitted.data.state).toBeUndefined();
  });

  it('rejects missing preparation, foreign capabilities and protected paths', async () => {
    await expect(
      context('submit', {
        opinion: buildReviewOpinion(state, state.groups[0]),
      }),
    ).rejects.toThrow(/brief/i);
    await expect(context('brief', { token: '0'.repeat(64) })).rejects.toThrow(
      /capability/i,
    );
    await context('brief');
    await expect(context('read', { path: '../outside.ts' })).rejects.toThrow(
      /path/i,
    );
    await expect(context('read', { path: '.npmrc' })).rejects.toThrow(
      /protected/i,
    );
    await expect(context('brief', { path: 'src' })).rejects.toThrow(
      /field|brief/i,
    );
    await expect(context('read')).rejects.toThrow(/path/i);
    await expect(context('search', { path: 'src' })).rejects.toThrow(/query/i);
    await expect(
      context('submit', {
        path: 'src/value.ts',
        opinion: buildReviewOpinion(state, state.groups[0]),
      }),
    ).rejects.toThrow(/field|submit/i);
  });

  it('binds a capability to one role and round', async () => {
    const token = computeReviewContextToken(
      state.groups[0].contextToken!,
      'review',
      1,
    );
    await expect(
      handleReviewState({
        action: 'context',
        projectRoot: fixture.projectRoot,
        generationId: state.generationId!,
        group: state.groups[0].id,
        token,
        kind: 'verify',
        operation: 'brief',
      }),
    ).rejects.toThrow(/capability/i);
    await expect(
      handleReviewState({
        action: 'context',
        projectRoot: fixture.projectRoot,
        generationId: state.generationId!,
        group: state.groups[0].id,
        token,
        kind: 'review',
        round: 2,
        operation: 'brief',
      }),
    ).rejects.toThrow(/capability|assignment/i);
  });

  it('changes a zero-result receipt when a committed matching caller appears', async () => {
    const before = await observeReviewContextReceipt(
      fixture.projectRoot,
      state.baseCommit,
      {
        operation: 'search',
        path: 'src',
        revision: 'head',
        query: 'futureConsumer',
      },
      false,
    );
    writeFileSync(
      join(fixture.projectRoot, 'src/future.ts'),
      'export const futureConsumer = true;\n',
    );
    runReviewStateFixtureGit(fixture.projectRoot, ['add', 'src/future.ts']);
    runReviewStateFixtureGit(fixture.projectRoot, [
      'commit',
      '-qm',
      'add future consumer',
    ]);
    const after = await observeReviewContextReceipt(
      fixture.projectRoot,
      state.baseCommit,
      {
        operation: 'search',
        path: 'src',
        revision: 'head',
        query: 'futureConsumer',
      },
      false,
    );
    expect(after.receipt.digest).not.toBe(before.receipt.digest);
  });

  it('makes a failed query permanently ineligible for cross-generation reuse', async () => {
    await context('brief');
    await expect(context('read', { path: '../outside.ts' })).rejects.toThrow(
      /path/i,
    );
    await completeIncrementalReview(fixture.projectRoot);
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
      changeContext: 'Review assigned changes.',
      actorContext: { mode: 'isolated', userInstructions: '' },
    });
    expect(prepared.summary).toMatchObject({ reusedGroups: 1, rerunGroups: 1 });
  });
});
