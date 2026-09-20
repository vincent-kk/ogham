import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createAdapterRegistry } from '../../adapters/index.js';
import {
  FACTS_GENERATION_ID_INVALID_CODE,
  FACTS_UNFROZEN_GENERATION_CODE,
  FACTS_UNKNOWN_CAUSES,
} from '../../constants/facts.js';
import { RESTRUCTURE_ACTIONS } from '../../constants/mcpContracts.js';
import {
  REVIEW_STATE_ACTIONS,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
} from '../../constants/reviewState.js';
import { resolveFactsStorePaths } from '../../core/facts/index.js';
import { createDefaultConfig } from '../../core/infra/configLoader/index.js';
import { createProjectSnapshot } from '../../core/projectSnapshot/index.js';
import { handleFacts } from '../../mcp/tools/facts/index.js';
import type { FactsStatusData } from '../../mcp/tools/facts/index.js';
import { describeUnknownFilesPostcondition } from '../../mcp/tools/restructure/utils/describeUnknownFilesPostcondition.js';
import { handleReviewState } from '../../mcp/tools/reviewState/index.js';
import { buildReviewOpinion } from '../unit/mcp/reviewState/helpers/buildReviewOpinion.js';
import {
  type ReviewStateSealFixture,
  createReviewStateSealFixture,
} from '../unit/mcp/reviewState/helpers/createReviewStateSealFixture.js';
import { buildReviewStateSealFinding } from '../unit/mcp/reviewState/helpers/buildReviewStateSealFinding.js';
import { prepareWithFacts } from '../unit/mcp/reviewState/helpers/prepareWithFacts.js';
import { seedFacts } from './helpers/seedFacts.js';
import { runReviewStateFixtureGit } from '../unit/mcp/reviewState/helpers/runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from '../unit/mcp/reviewState/helpers/writeReviewStateFixtureFile.js';

/**
 * Read one packaged skill document.
 * @param relativePath Skills-relative POSIX path.
 * @returns Its text.
 */
function skill(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../skills/${relativePath}`, import.meta.url)),
    'utf8',
  );
}

/** The table that tells each calling skill what an unfinished bootstrap means there. */
const FAILURE_TABLE = (() => {
  const text = skill('.shared/facts-bootstrap.md');
  return text.slice(text.indexOf('## If the bootstrap cannot finish'));
})();

/**
 * The failure table's row for one calling skill.
 * @param name Skill name as the row's first cell spells it, without backticks.
 * @returns Every row whose first cell names it; one, when the table is well formed.
 */
function rows(name: string): string[] {
  return FAILURE_TABLE.split('\n').filter(
    (line) => line.startsWith('|') && line.split('|')[1].includes(`\`${name}\``),
  );
}

/**
 * Drive a prepared review until a verify handoff exists, then read its brief.
 *
 * The id under test has to come from a brief the server rendered, not from a
 * variable this file kept: what `verifier.md` promises is that the value is
 * there to be read.
 * @param projectRoot Prepared fixture root.
 * @returns The rendered verify brief, verbatim.
 * @throws When the review finishes without ever dispatching a verifier.
 */
async function renderedVerifyBrief(projectRoot: string): Promise<string> {
  for (let step = 0; step < 200; step += 1) {
    const checkpoint = await handleReviewState({
      action: 'checkpoint',
      projectRoot,
    });
    const next = checkpoint.data.next?.[0];
    if (!next) break;
    if (next.kind === 'verify') return readFileSync(next.briefPath, 'utf8');
    const state = checkpoint.data.state!;
    const group = state.groups.find(({ id }) => id === next.group)!;
    // A round that finds nothing needs no verifier, so the reviewer reports
    // one finding — that is what makes the server dispatch the verify handoff.
    writeFileSync(
      next.outputPath,
      JSON.stringify({
        ...buildReviewOpinion(state, group, next.round),
        findings: [buildReviewStateSealFinding(group.id)],
      }),
    );
    const validated = await handleReviewState({
      action: 'validate',
      projectRoot,
      group: next.group,
      kind: next.kind,
      ...(next.round === undefined ? {} : { round: next.round }),
    });
    if (validated.summary.ok !== true)
      throw new Error(JSON.stringify(validated.data.problems));
  }
  throw new Error('the review fixture never dispatched a verifier');
}


/**
 * Leave one file uncertain for the single reason that a discard took its judgements.
 *
 * Its record is replaced with one claiming nothing, the item that opens is
 * adopted so the edge lives in the side table alone, and the shard holding that
 * adoption is made unparseable and discarded. The file is then left with a
 * current record, no refused claim and no open item — `awaitingComparison` is
 * the only list it appears in, which is the routing this gate has to name.
 *
 * @param projectRoot - Fixture root whose store is written.
 * @param outside - A writable directory outside that root, for submission files.
 * @param path - Project-relative POSIX path to strand.
 */
async function strandOnADiscard(
  projectRoot: string,
  outside: string,
  path: string,
): Promise<void> {
  const before = await handleFacts({ action: 'status', path: projectRoot });
  const bytes = readFileSync(join(projectRoot, path));
  const file = join(outside, 'shrink.json');
  writeFileSync(
    file,
    JSON.stringify([
      {
        schemaVersion: 1,
        path,
        contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        references: [],
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
    path: projectRoot,
    file,
    resolutionEpoch: (before.summary as { resolutionEpoch: string })
      .resolutionEpoch,
  });
  const opened = await handleFacts({ action: 'status', path: projectRoot });
  const item = (opened.data as FactsStatusData).unadjudicated.items[0];
  if (item === undefined) throw new Error('the shrink opened no item to adopt');
  await handleFacts({
    action: 'adjudicate',
    path: projectRoot,
    sourcePath: item.path,
    contentHash: item.contentHash,
    actor: 'reader-a',
    items: [
      {
        kind: item.kind,
        reference: item.reference,
        resolvedPath: item.resolvedPath,
        decision: 'adopt',
      },
    ],
  });
  const storePaths = resolveFactsStorePaths(projectRoot);
  const shard = storePaths.shardFileName(storePaths.pathDigest(path));
  writeFileSync(join(storePaths.sideTableDirectory, shard), '{ not json');
  await handleFacts({
    action: 'discard-damaged',
    path: projectRoot,
    shards: [shard],
  });
}

/** A review fixture prepared once, then given one committed file with no facts. */
let fixture: ReviewStateSealFixture;
/** The generation that prepare froze its facts into, before the file was added. */
let generationId: string;

beforeAll(async () => {
  fixture = await createReviewStateSealFixture();
  const prepared = await handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
    branchName: fixture.branchName,
    baseRef: 'main',
    effort: 'low',
  });
  generationId = prepared.summary.generationId ?? '';
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    'src/unsettled.ts',
    "export const unsettled = 'no record';\n",
  );
  runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(fixture.projectRoot, ['commit', '-m', 'unsettled']);
});
afterAll(() => {
  rmSync(fixture.projectRoot, { recursive: true, force: true });
  rmSync(fixture.pluginRoot, { recursive: true, force: true });
  if (fixture.originalPluginRoot === undefined)
    delete process.env.CLAUDE_PLUGIN_ROOT;
  else process.env.CLAUDE_PLUGIN_ROOT = fixture.originalPluginRoot;
});

/** Throwaway project used by the analysis row, removed after it. */
let analysisRoot: string | undefined;
afterEach(() => {
  if (analysisRoot) rmSync(analysisRoot, { recursive: true, force: true });
  analysisRoot = undefined;
});

describe('the failure table says what each caller really gets', () => {
  it('scan and guide: analysis reports the unsettled file instead of refusing', async () => {
    analysisRoot = mkdtempSync(join(tmpdir(), 'filid-bootstrap-routing-'));
    writeFileSync(
      join(analysisRoot, 'index.ts'),
      "export { value } from './value.js';\n",
    );
    writeFileSync(join(analysisRoot, 'value.ts'), 'export const value = 1;\n');

    const snapshot = await createProjectSnapshot(
      analysisRoot,
      createAdapterRegistry(),
      createDefaultConfig(),
    );

    expect(snapshot.dependencyGraph.unknownFiles.map(({ path }) => path)).toContain(
      'index.ts',
    );
    expect(snapshot.dependencyGraph.certainty).not.toBe('exact');
    expect(rows('scan')).toEqual(rows('guide'));
    // The row names a field, so take the field name from the payload it names.
    const [named] = Object.keys(snapshot.dependencyGraph).filter((field) =>
      rows('scan')[0].includes(field),
    );
    expect(named).toBe('unknownFiles');
  });

  it('cross-review: prepare refuses with facts-incomplete and points at the bootstrap', async () => {
    await expect(
      handleReviewState({
        action: 'prepare',
        projectRoot: fixture.projectRoot,
        branchName: fixture.branchName,
        baseRef: 'main',
        effort: 'low',
      }),
    ).rejects.toMatchObject({
      code: REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_INCOMPLETE,
      message: expect.stringContaining('src/unsettled.ts'),
      nextAction: REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_INCOMPLETE,
    });
    expect(REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_INCOMPLETE).toContain(
      'facts-bootstrap.md',
    );
    const row = rows('cross-review')[0];
    expect(row).toContain(REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_INCOMPLETE);
    expect(row).toMatch(/groups the files by cause/);
  });

  it('cross-review: the refusal groups the files by the cause that acts on them', async () => {
    const refused = await handleReviewState({
      action: 'prepare',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      effort: 'low',
    }).catch((error: unknown) => error);

    expect(refused).toMatchObject({
      message: expect.stringContaining(
        `${FACTS_UNKNOWN_CAUSES.MISSING} (1): src/unsettled.ts`,
      ),
    });
    for (const list of ['rejected', 'unadjudicated', 'pendingAttestations'])
      expect(REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_INCOMPLETE).toContain(
        list,
      );
  });

  it('cross-review: names the list a file held only by a discard is routed by', async () => {
    const local = await createReviewStateSealFixture();
    try {
      writeReviewStateFixtureFile(
        local.projectRoot,
        'src/helper.ts',
        'export const helper = 1;\n',
      );
      writeReviewStateFixtureFile(
        local.projectRoot,
        'src/value.ts',
        "import { helper } from './helper.js';\n\nexport const value = helper;\n",
      );
      runReviewStateFixtureGit(local.projectRoot, ['add', '--all']);
      runReviewStateFixtureGit(local.projectRoot, ['commit', '-m', 'edge']);
      await seedFacts(local.projectRoot);
      await strandOnADiscard(local.projectRoot, local.pluginRoot, 'src/value.ts');

      await expect(
        handleReviewState({
          action: 'prepare',
          projectRoot: local.projectRoot,
          branchName: local.branchName,
          baseRef: 'main',
          effort: 'low',
        }),
      ).rejects.toMatchObject({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_INCOMPLETE,
        message: expect.stringContaining('src/value.ts'),
        nextAction: REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_INCOMPLETE,
      });
      // The file is in none of the lists the sentence used to enumerate, so a
      // reader following it to the letter has nowhere to look.
      expect(REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_INCOMPLETE).toContain(
        'awaitingComparison',
      );
    } finally {
      rmSync(local.projectRoot, { recursive: true, force: true });
      rmSync(local.pluginRoot, { recursive: true, force: true });
      process.env.CLAUDE_PLUGIN_ROOT = fixture.pluginRoot;
    }
  });

  it('pull-request: handoff carries the gate diagnostic instead of swallowing it', async () => {
    const result = await handleReviewState({
      action: 'handoff',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
      documentSync: 'complete',
      repaired: 0,
    });

    expect(result.status).toBe('ok');
    expect(result.summary).toMatchObject({ documentSync: 'failed' });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_INCOMPLETE,
        nextAction: REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.FACTS_INCOMPLETE,
      }),
    );
    const row = rows('pull-request')[0];
    expect(row).toContain(REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_INCOMPLETE);
    expect(row).toContain(REVIEW_STATE_ACTIONS.HANDOFF);
    // The row sends the reader to a response field; it has to be one there is.
    expect(Object.keys(result).filter((field) => row.includes(field))).toContain(
      'diagnostics',
    );
  });

  it('revalidate: checkpoint has no facts gate of its own, by design', async () => {
    const result = await handleReviewState({
      action: 'checkpoint',
      projectRoot: fixture.projectRoot,
      branchName: fixture.branchName,
      baseRef: 'main',
    });

    const codes = (result.diagnostics ?? []).map(({ code }) => code);
    expect(codes).not.toContain(REVIEW_STATE_DIAGNOSTIC_CODES.FACTS_INCOMPLETE);
    expect(codes).toContain(REVIEW_STATE_DIAGNOSTIC_CODES.SOURCE_HASH_STALE);
    const row = rows('revalidate')[0];
    expect(row).toContain(REVIEW_STATE_DIAGNOSTIC_CODES.SOURCE_HASH_STALE);
    for (const action of [
      REVIEW_STATE_ACTIONS.CHECKPOINT,
      REVIEW_STATE_ACTIONS.PREPARE,
      REVIEW_STATE_ACTIONS.SEAL,
    ])
      expect(row).toContain(action);
  });

  // What `verifier.md` tells the verifier to pass is NOT checked here: the id
  // has to come from the rendered brief, and the brief does not carry it yet.
  it('compare answers from the generation its frozen facts belong to', async () => {
    const candidate = join(fixture.pluginRoot, 'verifier-candidate.json');
    writeFileSync(candidate, JSON.stringify([]));

    const frozen = await handleFacts({
      action: 'compare',
      path: fixture.projectRoot,
      file: candidate,
      generationId,
    });
    // Shaped like a generation id but not one on disk: the store looks and
    // finds nothing, which is a different answer from never having looked.
    const absent = await handleFacts({
      action: 'compare',
      path: fixture.projectRoot,
      file: candidate,
      generationId: 'f'.repeat(32),
    });
    const malformed = await handleFacts({
      action: 'compare',
      path: fixture.projectRoot,
      file: candidate,
      generationId: 'generation-that-never-existed',
    });

    expect(generationId).toMatch(/^[a-f0-9]{32}$/);
    expect((frozen.diagnostics ?? []).map(({ code }) => code)).not.toContain(
      FACTS_UNFROZEN_GENERATION_CODE,
    );
    expect((absent.diagnostics ?? []).map(({ code }) => code)).toContain(
      FACTS_UNFROZEN_GENERATION_CODE,
    );
    expect((malformed.diagnostics ?? []).map(({ code }) => code)).toContain(
      FACTS_GENERATION_ID_INVALID_CODE,
    );
  });

  it('restructure: the row names both actions and repeats the next action the server writes', () => {
    const row = rows('restructure')[0];

    expect(describeUnknownFilesPostcondition(1)).toContain(
      'no absence is asserted',
    );
    for (const action of [
      RESTRUCTURE_ACTIONS.PLAN,
      RESTRUCTURE_ACTIONS.POSTCONDITION,
    ])
      expect(row).toContain(action);
    expect(row).toMatch(/absence/);
  });

  it('pipeline: this row and the pipeline reference agree on one retry', () => {
    const row = rows('pipeline')[0];

    expect(row).toMatch(/re-run that stage once/i);
    expect(skill('pipeline/reference.md')).toMatch(
      /re-run the cycle once from `review`/i,
    );
    expect(skill('pipeline/reference.md')).toMatch(
      /second INCONCLUSIVE for the same reason stops the cycle/i,
    );
  });
});

describe('the verifier can reach the generation its brief was written for', () => {
  it('reads generation_id out of a rendered verify brief and compares against it', async () => {
    const verified = await createReviewStateSealFixture();
    try {
      await prepareWithFacts({
        action: 'prepare',
        projectRoot: verified.projectRoot,
        branchName: verified.branchName,
        baseRef: 'main',
        effort: 'low',
      });
      const brief = await renderedVerifyBrief(verified.projectRoot);
      const carried = /^generation_id: (\S+)$/m.exec(brief)?.[1];

      const candidate = join(verified.pluginRoot, 'from-brief.json');
      writeFileSync(candidate, JSON.stringify([]));
      const compared = await handleFacts({
        action: 'compare',
        path: verified.projectRoot,
        file: candidate,
        generationId: carried ?? '',
      });

      expect(carried).toMatch(/^[a-f0-9]{32}$/);
      expect((compared.diagnostics ?? []).map(({ code }) => code)).not.toContain(
        FACTS_UNFROZEN_GENERATION_CODE,
      );
      // The call itself has to name the key the brief carries — prose further
      // along the same line saying `generation_id` proves nothing about it.
      expect(
        /mcp__plugin_filid_tools__facts\(\{ action: "compare".*?\}\)/.exec(
          skill('cross-review/reviewers/verifier.md'),
        )?.[0],
      ).toContain('generation_id');
    } finally {
      rmSync(verified.projectRoot, { recursive: true, force: true });
      rmSync(verified.pluginRoot, { recursive: true, force: true });
      if (verified.originalPluginRoot === undefined)
        delete process.env.CLAUDE_PLUGIN_ROOT;
      else process.env.CLAUDE_PLUGIN_ROOT = verified.originalPluginRoot;
    }
  });
});
