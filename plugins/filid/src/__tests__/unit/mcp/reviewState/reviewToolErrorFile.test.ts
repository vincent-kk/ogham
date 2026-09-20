import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type { FactsStatusSummary } from '../../../../mcp/tools/facts/index.js';
import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import type { ReviewStateRecord } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';
import { seedFacts } from '../../../integration/helpers/seedFacts.js';

import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { buildVerifyOpinion } from './helpers/buildVerifyOpinion.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './helpers/writeReviewStateFixtureFile.js';

/** The one line of the changed file no provider can read. */
const BROKEN_SOURCE = 'export const broken = 1;\n';

let fixture: ReviewStateSealFixture;

beforeEach(async () => {
  fixture = await createReviewStateSealFixture();
  await configureReviewGroups(fixture.projectRoot, 1);
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    'src/broken.ts',
    BROKEN_SOURCE,
  );
  runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(fixture.projectRoot, ['commit', '-m', 'broken']);
  await seedFacts(fixture.projectRoot);
  await submitToolErrorRecord();
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/**
 * Replace `src/broken.ts`'s record with one saying no tool could read it.
 *
 * A re-extraction reproduces a `tool-error`, so it is the one unknown state
 * the facts gate lets through — which is what makes this review reach prepare
 * at all.
 * @returns Nothing; the store holds a tool-error record for that file.
 */
async function submitToolErrorRecord(): Promise<void> {
  const status = await handleFacts({
    action: 'status',
    path: fixture.projectRoot,
  });
  const bytes = readFileSync(join(fixture.projectRoot, 'src/broken.ts'));
  const file = join(fixture.pluginRoot, 'tool-error.json');
  writeFileSync(
    file,
    JSON.stringify([
      {
        schemaVersion: 1,
        path: 'src/broken.ts',
        contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        references: [],
        toolError: { message: 'the provider could not read this file' },
        provenance: {
          tool: 'other-tool',
          version: '1.0.0',
          command: 'test',
          tier: 'tool',
          resolutionInputs: [],
        },
      },
    ]),
  );
  await handleFacts({
    action: 'submit',
    path: fixture.projectRoot,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * Prepare the branch without re-seeding, so the tool-error record survives.
 * @returns The prepared state.
 */
async function prepare(): Promise<ReviewStateRecord> {
  return readPreparedReviewState(
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'low',
    }),
  );
}

/**
 * Drive every assignment, citing the tool-error candidate in the one finding.
 * @param state The prepared state the opinions copy their identity from.
 * @returns Nothing; it throws on the first validation the server refuses.
 * @throws When a validation is not ok, carrying the reported problems.
 */
async function reviewCitingToolError(state: ReviewStateRecord): Promise<void> {
  const finding = {
    id: 'R01-001',
    severity: 'error',
    category: 'bug',
    path: 'src/broken.ts',
    existingCode: BROKEN_SOURCE.trimEnd(),
    lines: 'unknown',
    rule: 'facts-tool-error',
    message: 'No provider can read this changed file.',
    evidence: 'src/broken.ts:1',
    consequence: 'The review asserts nothing about the references of this file.',
    recommendedAction: 'Submit an attested record for this file.',
  };
  for (let count = 0; count < 200; count++) {
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    const next = checkpoint.data.next?.[0];
    if (!next) return;
    const group = checkpoint.data.state!.groups.find(
      (entry) => entry.id === next.group,
    )!;
    const holdsBroken = group.units.some(
      (unit) => unit.path === 'src/broken.ts',
    );
    const opinion =
      next.kind === 'review'
        ? {
            ...buildReviewOpinion(state, group, next.round),
            findings: holdsBroken
              ? [{ ...finding, id: `R${next.group}-001` }]
              : [],
          }
        : buildVerifyOpinion(
            state,
            next.group,
            holdsBroken
              ? [
                  {
                    findingId: `R${next.group}-001`,
                    verdict: 'CONFIRMED',
                    evidence: 'src/broken.ts:1',
                    reason:
                      'The store holds a tool-error record for this file.',
                  },
                ]
              : [],
          );
    writeFileSync(next.outputPath, JSON.stringify(opinion));
    const result = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      group: next.group,
      kind: next.kind,
      ...(next.round === undefined ? {} : { round: next.round }),
    });
    if (result.summary.ok !== true)
      throw new Error(JSON.stringify(result.data.problems));
  }
  throw new Error('review fixture exceeded its handoff bound');
}

describe('a changed file no provider can read goes through the whole review', () => {
  it('prepares with a candidate whose rule is the facts state, not a roster rule', async () => {
    const state = await prepare();

    expect(
      state.scope.candidates.map(({ path, rule }) => ({ path, rule })),
    ).toContainEqual({ path: 'src/broken.ts', rule: 'facts-tool-error' });
  });

  it('validates and seals with a finding citing that candidate', async () => {
    const state = await prepare();

    await reviewCitingToolError(state);
    const sealed = await handleReviewState({
      action: 'seal',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    // The rule id is off the roster on purpose. Every validate on the way here
    // had to carry it without treating it as a rule the engine evaluates.
    expect(sealed.status).toBe('ok');
    expect(sealed.summary).toMatchObject({ disposition: 'sealed' });
  });
});
