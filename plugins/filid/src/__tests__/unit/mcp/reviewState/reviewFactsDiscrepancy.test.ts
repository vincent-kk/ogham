import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { computeReviewArtifactHash } from '../../../../mcp/tools/reviewState/hash/computeReviewArtifactHash.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsStatusData,
  FactsStatusSummary,
} from '../../../../mcp/tools/facts/index.js';
import { REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS } from '../../../../constants/reviewState.js';
import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';
import { resolveReviewStatePaths } from '../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type { ReviewStateRecord } from '../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { completeIncrementalReview } from './helpers/completeIncrementalReview.js';
import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { prepareWithFacts } from './helpers/prepareWithFacts.js';
import { runReviewStateFixtureGit } from './helpers/runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './helpers/writeReviewStateFixtureFile.js';

let fixture: ReviewStateSealFixture;

beforeEach(async () => {
  fixture = await createReviewStateSealFixture();
  await configureReviewGroups(fixture.projectRoot, 1);
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    'src/helper.ts',
    'export const helper = 1;\n',
  );
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    'src/other.ts',
    'export const other = 1;\n',
  );
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    'src/value.ts',
    "import { helper } from './helper.js';\n\nexport const value = helper;\n",
  );
  runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(fixture.projectRoot, ['commit', '-m', 'import']);
  await prepareWithFacts({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
    baseRef: 'main',
    effort: 'low',
  });
  await completeIncrementalReview(fixture.projectRoot);
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/**
 * Read the persisted state of the prepared generation.
 * @returns The record as it stands on disk.
 */
function readState(): ReviewStateRecord {
  return JSON.parse(
    readFileSync(
      resolveReviewStatePaths(fixture.projectRoot, fixture.branchName)
        .statePath,
      'utf8',
    ),
  ) as ReviewStateRecord;
}

/**
 * Submit a record resolving the file's one reference to another project file.
 * @param target Project-relative path the reference resolves to.
 */
async function submitReference(target: string): Promise<void> {
  const status = await handleFacts({
    action: 'status',
    path: fixture.projectRoot,
  });
  const bytes = readFileSync(join(fixture.projectRoot, 'src/value.ts'));
  const file = join(fixture.pluginRoot, 'repoint.json');
  writeFileSync(
    file,
    JSON.stringify([
      {
        schemaVersion: 1,
        path: 'src/value.ts',
        contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        references: [
          {
            specifier: './helper.js',
            kind: 'static',
            resolved: { path: target },
          },
        ],
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
 * Dismiss every open item, as the two readers of the bootstrap would.
 */
async function settleOpenItems(): Promise<void> {
  for (const actor of ['first-reader', 'second-reader'])
    for (const item of await openItems())
      await handleFacts({
        action: 'adjudicate',
        path: fixture.projectRoot,
        sourcePath: item.path,
        contentHash: item.contentHash,
        actor,
        items: [
          {
            kind: item.kind,
            reference: item.reference,
            resolvedPath: item.resolvedPath,
            decision: 'dismiss',
            reason: 'The replacement re-pointed this reference.',
          },
        ],
      });
}

/**
 * Seal the prepared review.
 * @returns The seal result.
 */
function seal() {
  return handleReviewState({
    action: 'seal',
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
  });
}

/**
 * Every open side-table item the project holds.
 * @returns Items as `facts status` reports them.
 */
async function openItems() {
  const status = await handleFacts({
    action: 'status',
    path: fixture.projectRoot,
  });
  return (status.data as FactsStatusData).unadjudicated.items;
}

/**
 * Open one item by submitting a record that drops the file's only edge.
 * @returns Nothing; the side table holds one unadjudicated item.
 */
async function openOneItem(): Promise<void> {
  const status = await handleFacts({
    action: 'status',
    path: fixture.projectRoot,
  });
  const bytes = readFileSync(join(fixture.projectRoot, 'src/value.ts'));
  const record = {
    schemaVersion: 1,
    path: 'src/value.ts',
    contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
    references: [],
    provenance: {
      tool: 'other-tool',
      version: '1.0.0',
      command: 'test',
      tier: 'tool',
      resolutionInputs: [],
    },
  };
  const file = join(fixture.pluginRoot, 'shrink.json');
  writeFileSync(file, JSON.stringify([record]));
  await handleFacts({
    action: 'submit',
    path: fixture.projectRoot,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * Replace `src/value.ts`'s record with one saying no tool could read it.
 * @returns Nothing; the file's state becomes `tool-error`.
 */
async function submitToolErrorRecord(): Promise<void> {
  const status = await handleFacts({
    action: 'status',
    path: fixture.projectRoot,
  });
  const bytes = readFileSync(join(fixture.projectRoot, 'src/value.ts'));
  const file = join(fixture.pluginRoot, 'tool-error.json');
  writeFileSync(
    file,
    JSON.stringify([
      {
        schemaVersion: 1,
        path: 'src/value.ts',
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
 * Prepare a fresh generation and validate it, without re-seeding the store.
 * @returns Nothing; the branch holds a complete, unsealed generation.
 */
async function prepareAndReview(): Promise<void> {
  await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
    baseRef: 'main',
    effort: 'low',
  });
  await completeIncrementalReview(fixture.projectRoot);
}

describe('a file the freeze could not read is not held to its frozen edges', () => {
  it('seals a review whose tool-error file still carries an adopted item', async () => {
    await openOneItem();
    const [item] = await openItems();
    await handleFacts({
      action: 'adjudicate',
      path: fixture.projectRoot,
      sourcePath: item.path,
      contentHash: item.contentHash,
      actor: 'first-reader',
      items: [
        {
          kind: item.kind,
          reference: item.reference,
          resolvedPath: item.resolvedPath,
          decision: 'adopt',
        },
      ],
    });
    await submitToolErrorRecord();
    await prepareAndReview();

    const result = await seal();

    // The frozen references of a tool-error file are empty because nothing
    // could read it. Demanding the adopted edge among them would refuse every
    // generation, and re-preparing would freeze the same empty list.
    expect(result.diagnostics?.map(({ code }) => code) ?? []).not.toContain(
      'facts-discrepancy',
    );
    expect(result.status).toBe('ok');
    expect(readState().verdict).not.toBeNull();
  });
});

describe('frozen facts are parsed, not assumed', () => {
  it('refuses a facts file whose digest matches but whose shape does not', async () => {
    const { factsPath, statePath } = resolveReviewStatePaths(
      fixture.projectRoot,
      fixture.branchName,
    );
    // Both files live in the same tree, so a digest that matches proves the
    // two were rewritten together — never that the shape is readable.
    const text = '[{"path":"src/value.ts","references":"not an array"}]\n';
    writeFileSync(factsPath, text);
    const state = JSON.parse(readFileSync(statePath, 'utf8')) as {
      scope: { factsDigest: string };
    };
    state.scope.factsDigest = computeReviewArtifactHash(text);
    writeFileSync(statePath, JSON.stringify(state, null, 2));

    const refused = await seal();

    expect(refused.status).toBe('indeterminate');
    expect(refused.diagnostics?.map(({ code }) => code)).toContain(
      'review-facts-frozen-unusable',
    );
  });
});

describe('a file the freeze could not read and the store still cannot', () => {
  it('seals although an unsettled item now sits on it', async () => {
    await submitToolErrorRecord();
    await prepareAndReview();

    // Re-pointing the edge the toolError record's shrink baseline carried is
    // a claim two actors owe a judgement on, so the file is uncertain. The
    // freeze gave the review no edge for it and it still gives none, so the
    // evidence the review stood on is unchanged — what the check guards is a
    // file that became `exact`, which is knowledge the review never had.
    await submitReference('src/other.ts');
    const status = await handleFacts({
      action: 'status',
      path: fixture.projectRoot,
    });
    expect(
      (status.data as FactsStatusData).unadjudicated.items.map(
        (item) => item.path,
      ),
    ).toContain('src/value.ts');

    const result = await seal();

    expect(result.diagnostics?.map(({ code }) => code) ?? []).not.toContain(
      'facts-discrepancy',
    );
    expect(result.status).toBe('ok');
    expect(readState().verdict).not.toBeNull();
  });
});

describe('a file the freeze could not read but the store now can', () => {
  it('refuses to seal over edges that appeared after the freeze', async () => {
    await submitToolErrorRecord();
    await prepareAndReview();

    // Mid-review somebody submitted a record the tool could read. Its edges
    // were never judged by anyone, and the frozen list is empty because the
    // freeze could not read the file — not because it has no edges. It resolves
    // the reference the way the last readable record did, so the store accepts
    // it outright: a record that re-points the edge the `toolError` record's
    // shrink baseline carried opens an item instead, and a file with an open
    // item is not one the store can answer for.
    await submitReference('src/helper.ts');

    const result = await seal();

    expect(result.status).toBe('indeterminate');
    expect(result.diagnostics?.map(({ code }) => code)).toContain(
      'facts-discrepancy',
    );
    expect(readState().phase).not.toBe('sealed');
  });
});

describe('a generation whose frozen facts are not the ones it recorded', () => {
  it.for([['removed'], ['edited']] as const)(
    'refuses to seal when the facts file was %s, and seals after one prepare',
    async ([how]) => {
      const { factsPath } = resolveReviewStatePaths(
        fixture.projectRoot,
        fixture.branchName,
      );
      if (how === 'removed') rmSync(factsPath);
      else writeFileSync(factsPath, '[]\n');

      const refused = await seal();

      expect(refused.status).toBe('indeterminate');
      expect(refused.diagnostics?.map(({ code }) => code)).toContain(
        'review-facts-frozen-unusable',
      );
      expect(readState().phase).not.toBe('sealed');

      await prepareAndReview();

      expect((await seal()).status).toBe('ok');
    },
  );
});

describe('seal refuses before the fold when the facts are disputed', () => {
  it('returns INDETERMINATE with facts-discrepancy and seals nothing', async () => {
    await openOneItem();
    expect(await openItems()).not.toEqual([]);

    const result = await seal();

    expect(result.status).toBe('indeterminate');
    expect(result.diagnostics?.map(({ code }) => code)).toContain(
      'facts-discrepancy',
    );
    const state = readState();
    expect(state.phase).not.toBe('sealed');
    expect(state.verdict).toBeNull();
  });

  it('names the file and line the caller has to read', async () => {
    await openOneItem();

    const result = await seal();

    expect(result.diagnostics?.[0]).toMatchObject({
      code: 'facts-discrepancy',
      path: 'src/value.ts',
      owner: 'agent',
      line: 1,
    });
  });

  it('tells an unsettled item apart from an edge that moved', async () => {
    await openOneItem();

    const result = await seal();

    // The two halves share a code and differ in what they ask for: an open
    // item is adjudicated and needs no new review, a changed edge needs one.
    // A lookup that never matched would leave only the second, and the
    // caller would re-prepare for something a judgement clears.
    expect(
      result.diagnostics?.map(({ nextAction }) => nextAction),
    ).toContainEqual(expect.stringContaining('facts adjudicate'));
  });

  it('locates an edge the store added, not the path it resolves to', async () => {
    // The adopted edge is not spelled as its resolved path anywhere in the
    // file, so looking for that path finds nothing and the line goes missing.
    await submitReference('src/other.ts');
    const [item] = await openItems();
    await handleFacts({
      action: 'adjudicate',
      path: fixture.projectRoot,
      sourcePath: item.path,
      contentHash: item.contentHash,
      actor: 'first-reader',
      items: [
        {
          kind: item.kind,
          reference: item.reference,
          resolvedPath: item.resolvedPath,
          decision: 'adopt',
        },
      ],
    });

    const result = await seal();

    expect(result.diagnostics?.[0]).toMatchObject({
      code: 'facts-discrepancy',
      path: 'src/value.ts',
      line: 1,
    });
  });

  it('refuses a frozen edge the store no longer carries, and the next generation seals', async () => {
    await openOneItem();
    const [item] = await openItems();
    for (const actor of ['first-reader', 'second-reader'])
      await handleFacts({
        action: 'adjudicate',
        path: fixture.projectRoot,
        sourcePath: item.path,
        contentHash: item.contentHash,
        actor,
        items: [
          {
            kind: item.kind,
            reference: item.reference,
            resolvedPath: item.resolvedPath,
            decision: 'dismiss',
            reason: 'The other tool does not report re-exports.',
          },
        ],
      });

    // The dismissal settles the item, so nothing is unadjudicated any more —
    // but the edge the review was judged on is gone, and a conclusion that
    // requires an absence would be suppressed by that ghost.
    const refused = await seal();

    expect(refused.status).toBe('indeterminate');
    expect(refused.diagnostics?.map(({ code }) => code)).toContain(
      'facts-discrepancy',
    );
    expect(refused.diagnostics?.[0]?.nextAction).toContain('prepare once');

    // Following that next action is not a loop: the new generation freezes the
    // edges as they now stand, so the same comparison passes.
    await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'low',
    });
    await completeIncrementalReview(fixture.projectRoot);

    const sealed = await seal();

    expect(sealed.status).toBe('ok');
    expect(sealed.summary).toMatchObject({ disposition: 'sealed' });
  });

  it('seals when the settlement leaves the frozen edges as they were', async () => {
    // The record walked back an edge the generation froze, so adopting the
    // item puts that same edge back into the file's valid references: the set
    // the review answered for is the set the store now holds.
    await openOneItem();
    const [item] = await openItems();
    await handleFacts({
      action: 'adjudicate',
      path: fixture.projectRoot,
      sourcePath: item.path,
      contentHash: item.contentHash,
      actor: 'first-reader',
      items: [
        {
          kind: item.kind,
          reference: item.reference,
          resolvedPath: item.resolvedPath,
          decision: 'adopt',
        },
      ],
    });

    const sealed = await seal();

    expect(sealed.status).toBe('ok');
    expect(sealed.summary).toMatchObject({ disposition: 'sealed' });
  });

  it('asks for a prepare when the settlement adds an edge the freeze lacked', async () => {
    // Here adopting does the opposite: the item is an edge the generation
    // never froze, so settling it grows the valid set and the review answered
    // for the smaller one. Which branch a settled item lands in is decided by
    // the edges it leaves behind, not by the decision that settled it.
    await submitReference('src/other.ts');
    const [item] = await openItems();
    await handleFacts({
      action: 'adjudicate',
      path: fixture.projectRoot,
      sourcePath: item.path,
      contentHash: item.contentHash,
      actor: 'first-reader',
      items: [
        {
          kind: item.kind,
          reference: item.reference,
          resolvedPath: item.resolvedPath,
          decision: 'adopt',
        },
      ],
    });

    const refused = await seal();

    expect(refused.status).toBe('indeterminate');
    expect(refused.diagnostics?.[0]?.nextAction).toContain('prepare once');
    expect(await openItems()).toEqual([]);
    // So the sentence that sent the caller to adjudicate has to admit this
    // branch exists; promising the next seal publishes costs a whole call.
    expect(
      REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_DISCREPANCY_UNSETTLED,
    ).toContain('prepare');
  });

  it('records the items the seal referenced in the sealed state', async () => {
    await seal();
    const state = readState();

    expect(state.phase).toBe('sealed');
    expect(state.factsAdjudications).toEqual([]);
    expect(state.factsAdjudicationsDigest).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('a generation replaced because the facts changed', () => {
  it('sends an actor holding the old brief down the superseded path', async () => {
    const first = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    const dispatched = first.data.next?.[0];
    // Re-point the one reference at another file that exists: the record is
    // still bound to the same bytes, so only the valid references change.
    await submitReference('src/other.ts');
    await settleOpenItems();

    // No re-seed here: the point is the facts this test submitted by hand.
    const replaced = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'low',
    });

    expect(replaced.summary.generationId).not.toBe(first.summary.generationId);
    if (!dispatched) return;
    const validated = await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      kind: dispatched.kind,
      group: dispatched.group,
      ...(dispatched.round === undefined ? {} : { round: dispatched.round }),
      generationId: dispatched.generationId,
    });
    expect(validated.summary.ok).toBe(false);
    expect(validated.diagnostics?.map(({ code }) => code)).toContain(
      'review-generation-superseded',
    );
  });
});
