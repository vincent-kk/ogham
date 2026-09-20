import { createHash } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveFactsStorePaths } from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsCompareSummary,
  FactsStatusData,
} from '../../../../mcp/tools/facts/index.js';
import { computeReviewArtifactHash } from '../../../../mcp/tools/reviewState/hash/computeReviewArtifactHash.js';
import { resolveReviewStatePaths } from '../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import { handleReviewState } from '../../../../mcp/tools/reviewState/index.js';

import { configureReviewGroups } from './helpers/configureReviewGroups.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from './helpers/createReviewStateSealFixture.js';
import { prepareWithFacts } from './helpers/prepareWithFacts.js';
import { buildReviewOpinion } from './helpers/buildReviewOpinion.js';
import { readPreparedReviewState } from './helpers/readPreparedReviewState.js';
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
    'src/value.ts',
    "import { helper } from './helper.js';\n\nexport const value = helper;\n",
  );
  runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(fixture.projectRoot, ['commit', '-m', 'import']);
});
afterEach(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/**
 * Prepare the fixture branch with its facts bootstrapped.
 * @returns The prepare result.
 */
function prepare() {
  return prepareWithFacts({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
    baseRef: 'main',
    effort: 'low',
  });
}

describe('prepare freezes the facts the review is judged on', () => {
  it('writes the review scope references and records their digest', async () => {
    const prepared = await prepare();
    const state = readPreparedReviewState(prepared);

    expect(
      JSON.parse(readFileSync(prepared.data.factsPath, 'utf8')),
    ).toContainEqual({
      path: 'src/value.ts',
      state: 'exact',
      references: [
        {
          reference: './helper.js',
          kind: 'static',
          resolvedPath: 'src/helper.ts',
        },
      ],
      adjudications: [],
    });
    expect(state.scope.factsDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(
      state.scope.files.find((file) => file.path === 'src/value.ts')?.factsHash,
    ).toMatch(/^[a-f0-9]{64}$/);
  });

  it('carries every in-scope file, empty where the store holds no edge for it', async () => {
    const prepared = await prepare();
    const state = readPreparedReviewState(prepared);

    const frozen = JSON.parse(
      readFileSync(prepared.data.factsPath, 'utf8'),
    ) as { path: string; state: string; references: unknown[] }[];

    // "Not frozen" and "frozen, and it had no edges" have to read differently,
    // or an edge adopted later passes the seal's comparison unseen.
    expect(frozen).toContainEqual({
      path: 'src/helper.ts',
      state: 'exact',
      references: [],
      adjudications: [],
    });
    // The lockfile is outside the facts scope, so no record can exist for it
    // and freezing an empty entry would claim a reading nobody did.
    expect(frozen.map(({ path }) => path)).not.toContain('yarn.lock');
    expect(
      state.scope.files.find((file) => file.path === 'yarn.lock')?.factsHash,
    ).toBeUndefined();
  });

  it('orders the frozen entries by raw bytes, not by the machine locale', async () => {
    writeReviewStateFixtureFile(
      fixture.projectRoot,
      'src/B.ts',
      'export const b = 1;\n',
    );
    writeReviewStateFixtureFile(
      fixture.projectRoot,
      'src/a.ts',
      'export const a = 1;\n',
    );
    runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
    runReviewStateFixtureGit(fixture.projectRoot, ['commit', '-m', 'case']);

    const prepared = await prepare();

    // `'src/B.ts'.localeCompare('src/a.ts')` is positive and the byte order is
    // negative: sorting a digest input by ICU collation makes the same store
    // hash differently on two machines.
    expect(
      (
        JSON.parse(readFileSync(prepared.data.factsPath, 'utf8')) as {
          path: string;
        }[]
      ).map(({ path }) => path),
    ).toEqual(['src/B.ts', 'src/a.ts', 'src/helper.ts', 'src/value.ts']);
  });

  it('prepares again when the frozen facts of a generation are gone', async () => {
    const first = await prepare();
    rmSync(first.data.factsPath);

    const second = await prepare();

    expect(readFileSync(second.data.factsPath, 'utf8')).toContain(
      'src/value.ts',
    );
  });

  it('stays fresh through a checkpoint with the projection in its hash', async () => {
    await prepare();

    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
    });

    // Prepare and the freshness check must project the frozen facts the same
    // way; if only one of them did, this generation would be born stale.
    expect(checkpoint).toMatchObject({ status: 'ok' });
    expect(checkpoint.diagnostics?.map(({ code }) => code) ?? []).not.toContain(
      'review-inputs-stale',
    );
  });

  it('carries the projection in the file evidence hash, not the bare tuple', async () => {
    const state = readPreparedReviewState(await prepare());
    const group = state.groups.find((entry) =>
      entry.units.some((unit) => unit.path === 'src/value.ts'),
    )!;

    // No candidate and no handoff claim name this file, so the pre-projection
    // tuple is empty: a hash that still differs from the empty one can only
    // differ because the frozen facts joined it (spec §9).
    expect(
      state.scope.candidates.filter(({ path }) => path === 'src/value.ts'),
    ).toEqual([]);
    expect(group.fileInputs?.['src/value.ts']?.evidenceHash).not.toBe(
      computeReviewArtifactHash(JSON.stringify([[], []])),
    );
  });
});

describe('a comparison against a generation reads that generation\'s facts', () => {
  it('measures the candidate against the frozen edges, not the live store', async () => {
    const state = readPreparedReviewState(await prepare());
    const bytes = readFileSync(join(fixture.projectRoot, 'src/value.ts'));
    const contentHash = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    const record = (references: unknown[]) => [
      {
        schemaVersion: 1,
        path: 'src/value.ts',
        contentHash,
        references,
        provenance: {
          tool: 'other-tool',
          version: '1.0.0',
          command: 'test',
          tier: 'tool',
          resolutionInputs: [],
        },
      },
    ];
    const edge = {
      specifier: './helper.js',
      kind: 'static',
      resolved: { path: 'src/helper.ts' },
    };
    // The live store loses the edge the generation froze.
    const shrink = join(fixture.pluginRoot, 'shrink.json');
    writeFileSync(shrink, JSON.stringify(record([])));
    const status = await handleFacts({
      action: 'status',
      path: fixture.projectRoot,
    });
    await handleFacts({
      action: 'submit',
      path: fixture.projectRoot,
      file: shrink,
      resolutionEpoch: (status.summary as { resolutionEpoch: string })
        .resolutionEpoch,
    });
    const candidate = join(fixture.pluginRoot, 'candidate.json');
    writeFileSync(candidate, JSON.stringify(record([edge])));

    const result = await handleFacts({
      action: 'compare',
      path: fixture.projectRoot,
      file: candidate,
      generationId: state.generationId!,
    });

    // Against the live store the candidate's edge would be missing; against
    // the frozen facts it is exactly what the review was judged on.
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      'facts-generation-not-frozen',
    );
    expect(result.summary as FactsCompareSummary).toMatchObject({
      comparedFiles: 1,
      missingInStore: 0,
    });
  });
});

describe('a generationId that could never name a generation is refused', () => {
  it.for([['../escape'], ['not-hex'], ['']] as const)(
    'answers %j with a next action instead of throwing',
    async ([generationId]) => {
      const candidate = join(fixture.pluginRoot, 'candidate.json');
      writeFileSync(candidate, JSON.stringify([]));

      const result = await handleFacts({
        action: 'compare',
        path: fixture.projectRoot,
        file: candidate,
        generationId,
      });

      expect(result.diagnostics.map(({ code }) => code)).toContain(
        'facts-generation-id-invalid',
      );
      expect(result.diagnostics[0]?.nextAction).toContain('32 hexadecimal');
    },
  );
});

describe('a verify brief names the generation it belongs to', () => {
  it('carries generation_id, equal to what the handoff reports', async () => {
    await prepare();
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
    });
    const next = checkpoint.data.next?.[0];
    const state = checkpoint.data.state!;
    const group = state.groups.find((entry) => entry.id === next!.group)!;
    writeFileSync(
      next!.outputPath,
      JSON.stringify(buildReviewOpinion(state, group, next!.round)),
    );
    await handleReviewState({
      action: 'validate',
      projectRoot: fixture.projectRoot,
      group: next!.group,
      kind: next!.kind,
      ...(next!.round === undefined ? {} : { round: next!.round }),
    });

    // The verifier subagent is handed this file and nothing else, so the id
    // has to be in it for `facts compare` to name the frozen facts at all.
    const brief = readFileSync(
      join(
        resolveReviewStatePaths(fixture.projectRoot, fixture.branchName)
          .reviewDirectory,
        group.verifyBriefPath,
      ),
      'utf8',
    );
    expect(brief).toContain(`generation_id: ${state.generationId}`);
  });
});

/**
 * Write a submission file for `src/value.ts` under the fixture's plugin root.
 * @param name File name to write.
 * @param references What the record claims.
 * @param tool `provenance.tool` the record declares.
 * @returns Absolute path of the written file.
 */
function writeValueRecord(
  name: string,
  references: unknown[],
  tool: string,
): string {
  const bytes = readFileSync(join(fixture.projectRoot, 'src/value.ts'));
  const path = join(fixture.pluginRoot, name);
  writeFileSync(
    path,
    JSON.stringify([
      {
        schemaVersion: 1,
        path: 'src/value.ts',
        contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        references,
        provenance: {
          tool,
          version: '1.0.0',
          command: 'test',
          tier: 'tool',
          resolutionInputs: [],
        },
      },
    ]),
  );
  return path;
}

/**
 * Submit one record for `src/value.ts` at the epoch status reports.
 * @param name Submission file name.
 * @param references What the record claims.
 * @param tool `provenance.tool` the record declares.
 */
async function submitValue(
  name: string,
  references: unknown[],
  tool: string,
): Promise<void> {
  const status = await handleFacts({
    action: 'status',
    path: fixture.projectRoot,
  });
  await handleFacts({
    action: 'submit',
    path: fixture.projectRoot,
    file: writeValueRecord(name, references, tool),
    resolutionEpoch: (status.summary as { resolutionEpoch: string })
      .resolutionEpoch,
  });
}

/**
 * Leave `src/value.ts`'s only edge carried by an adopted item, then lose it.
 *
 * The record is replaced with one claiming nothing, the item that opens is
 * adopted — so the edge lives in the side table alone — and the shard holding
 * that adoption is made unparseable and discarded. What the review was judged
 * on is now in the frozen facts and nowhere else.
 */
async function adoptTheEdgeThenDiscardIt(): Promise<void> {
  await submitValue('shrink.json', [], 'other-tool');
  const status = await handleFacts({
    action: 'status',
    path: fixture.projectRoot,
  });
  const item = (status.data as FactsStatusData).unadjudicated.items[0];
  await handleFacts({
    action: 'adjudicate',
    path: fixture.projectRoot,
    sourcePath: item!.path,
    contentHash: item!.contentHash,
    actor: 'reader-a',
    items: [
      {
        kind: item!.kind,
        reference: item!.reference,
        resolvedPath: item!.resolvedPath,
        decision: 'adopt',
      },
    ],
  });
  const storePaths = resolveFactsStorePaths(fixture.projectRoot);
  const shard = storePaths.shardFileName(storePaths.pathDigest('src/value.ts'));
  writeFileSync(join(storePaths.sideTableDirectory, shard), '{ not json');
  await handleFacts({
    action: 'discard-damaged',
    path: fixture.projectRoot,
    shards: [shard],
  });
}

/** Files `status` reports as owing a comparison, by path. */
async function awaitingPaths(): Promise<string[]> {
  const status = await handleFacts({
    action: 'status',
    path: fixture.projectRoot,
  });
  return (status.data as FactsStatusData).awaitingComparison.items.map(
    (entry) => entry.path,
  );
}

describe('a comparison against a generation cannot answer for a discard', () => {
  it('leaves the file owing a comparison against the store', async () => {
    const state = readPreparedReviewState(await prepare());
    await adoptTheEdgeThenDiscardIt();
    const candidate = writeValueRecord(
      'candidate.json',
      [{ specifier: './helper.js', kind: 'static', resolved: { path: 'src/helper.ts' } }],
      'third-tool',
    );

    // Candidate and frozen facts agree, so this finds nothing — and the store
    // is what lost the edge, which a frozen baseline cannot see.
    const result = await handleFacts({
      action: 'compare',
      path: fixture.projectRoot,
      file: candidate,
      generationId: state.generationId!,
    });

    expect(await awaitingPaths()).toContain('src/value.ts');
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      'facts-comparison-not-against-store',
    );
  });

  it('clears it when the same candidate is compared against the store', async () => {
    await prepare();
    await adoptTheEdgeThenDiscardIt();
    const candidate = writeValueRecord(
      'candidate.json',
      [{ specifier: './helper.js', kind: 'static', resolved: { path: 'src/helper.ts' } }],
      'third-tool',
    );

    const result = await handleFacts({
      action: 'compare',
      path: fixture.projectRoot,
      file: candidate,
    });

    expect(result.summary as FactsCompareSummary).toMatchObject({
      missingInStore: 1,
    });
    expect(await awaitingPaths()).toEqual([]);
  });
});
