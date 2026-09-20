import { readFileSync, rmSync, writeFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import { createReviewStateSealFixture } from './helpers/createReviewStateSealFixture.js';

/** Review whose first generation an actor still holds. */
let fixture: Awaited<ReturnType<typeof createReviewStateSealFixture>>;

beforeEach(async () => {
  fixture = await createReviewStateSealFixture();
  await configureReviewGroups(fixture.projectRoot, 1);
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

describe('an opinion written for a replaced generation is discarded, not merged', () => {
  it('gives every handoff the generation it was dispatched from', async () => {
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    expect(prepared.data.next.length).toBeGreaterThan(0);
    for (const handoff of prepared.data.next)
      expect(handoff.generationId).toBe(prepared.summary.generationId);
  });

  it('refuses an opinion from a replaced generation even when the group id repeats', async () => {
    const first = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    const dispatched = first.data.next[0]!;
    writeFileSync(
      first.data.statePath,
      JSON.stringify({
        ...JSON.parse(readFileSync(first.data.statePath, 'utf8')),
        schemaVersion: 1,
      }),
    );
    const replaced = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    expect(replaced.summary.generationId).not.toBe(first.summary.generationId);
    expect(replaced.data.next[0]!.group).toBe(dispatched.group);
    const validated = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: dispatched.kind,
      group: dispatched.group,
      ...(dispatched.round === undefined ? {} : { round: dispatched.round }),
      generationId: dispatched.generationId,
    });
    expect(validated.summary.ok).toBe(false);
    expect(validated.diagnostics.map(({ code }) => code)).toContain(
      'review-generation-superseded',
    );
  });

  it('names the superseded generation and sends the caller to the latest handoffs', async () => {
    const first = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
      userInstructions: 'first',
    });
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    const next = checkpoint.data.next![0]!;
    const state = checkpoint.data.state!;
    writeFileSync(
      next.outputPath,
      JSON.stringify(
        buildReviewOpinion(
          state,
          state.groups.find((group) => group.id === next.group)!,
          next.round,
        ),
      ),
    );
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
      userInstructions: 'second',
    });
    const validated = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: next.kind,
      group: next.group,
      ...(next.round === undefined ? {} : { round: next.round }),
      generationId: first.summary.generationId,
    });
    expect(validated.summary.ok).toBe(false);
    const diagnostic = validated.diagnostics.find(
      ({ code }) => code === 'review-generation-superseded',
    );
    expect(diagnostic?.nextAction).toContain('discard');
    expect(diagnostic?.nextAction).not.toMatch(/\buser\b/);
  });
});
