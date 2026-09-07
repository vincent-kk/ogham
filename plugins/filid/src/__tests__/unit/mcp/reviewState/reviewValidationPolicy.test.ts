import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';

/** Isolated states distinguish policy compatibility from source identity. */
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

describe('review validation policy compatibility', () => {
  it.each([
    ['prepared', undefined, 'prepare'],
    ['prepared', undefined, 'checkpoint'],
    ['prepared', undefined, 'validate'],
    ['prepared', undefined, 'seal'],
    ['prepared', 99, 'prepare'],
    ['prepared', 99, 'checkpoint'],
    ['prepared', 99, 'validate'],
    ['prepared', 99, 'seal'],
    ['sealed', undefined, 'prepare'],
    ['sealed', undefined, 'checkpoint'],
    ['sealed', undefined, 'validate'],
    ['sealed', undefined, 'seal'],
    ['sealed', 99, 'prepare'],
    ['sealed', 99, 'checkpoint'],
    ['sealed', 99, 'validate'],
    ['sealed', 99, 'seal'],
  ] as const)(
    'blocks %s policy %s through %s without rewriting history',
    async (phase, version, action) => {
      configureReviewGroups(fixture.projectRoot, 1);
      const prepared = await handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        effort: 'low',
      });
      const state = readPreparedReviewState(prepared);
      const group = state.groups[0]!;
      writeFileSync(
        join(prepared.data.reviewDirectory, group.skeletonPath),
        JSON.stringify(buildReviewOpinion(state, group)),
      );
      await handleReviewState({
        action: 'validate',
        projectRoot: fixture.projectRoot,
        kind: 'review',
        group: group.id,
        round: 1,
      });
      if (phase === 'sealed')
        await handleReviewState({
          action: 'seal',
          projectRoot: fixture.projectRoot,
        });
      const old = {
        ...readPreparedReviewState(prepared),
        validationPolicyVersion: version,
      };
      writeFileSync(prepared.data.statePath, JSON.stringify(old));
      const before = readFileSync(prepared.data.statePath, 'utf8');
      const session = readFileSync(prepared.data.sessionPath, 'utf8');
      await expect(
        handleReviewState({
          action,
          projectRoot: fixture.projectRoot,
          ...(action === 'validate'
            ? { kind: 'review', group: group.id, round: 1 }
            : {}),
        }),
      ).rejects.toMatchObject({ code: 'review-validation-policy-outdated' });
      expect(readFileSync(prepared.data.statePath, 'utf8')).toBe(before);
      expect(readFileSync(prepared.data.sessionPath, 'utf8')).toBe(session);
    },
  );

  it('stamps only fresh state and reuses a current sealed cache', async () => {
    configureReviewGroups(fixture.projectRoot, 1);
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      effort: 'low',
    });
    const state = readPreparedReviewState(prepared);
    expect(state).toHaveProperty('validationPolicyVersion', 1);
    const group = state.groups[0]!;
    writeFileSync(
      join(prepared.data.reviewDirectory, group.skeletonPath),
      JSON.stringify(buildReviewOpinion(state, group)),
    );
    await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      kind: 'review',
      group: group.id,
      round: 1,
    });
    await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
    });
    const before = readFileSync(prepared.data.statePath, 'utf8');
    expect(
      (
        await handleReviewState({
          action: 'prepare',
          projectRoot: fixture.projectRoot,
          effort: 'high',
        })
      ).summary,
    ).toMatchObject({ disposition: 'cached', verdict: 'APPROVED' });
    expect(readFileSync(prepared.data.statePath, 'utf8')).toBe(before);
  });

  it('requires explicit force to replace an obsolete policy', async () => {
    configureReviewGroups(fixture.projectRoot, 1);
    const prepared = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
    });
    const legacy = {
      ...readPreparedReviewState(prepared),
      validationPolicyVersion: undefined,
    };
    writeFileSync(prepared.data.statePath, JSON.stringify(legacy));
    const fresh = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      force: true,
    });
    expect(fresh.summary.disposition).toBe('fresh');
    expect(readPreparedReviewState(fresh)).toHaveProperty(
      'validationPolicyVersion',
      1,
    );
  });
});
