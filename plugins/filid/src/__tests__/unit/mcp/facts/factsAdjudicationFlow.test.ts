import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FACTS_ADJUDICATION_REFUSALS,
  FACTS_ADJUDICATION_STALE_CODE,
  FACTS_ADJUDICATION_STATES,
  FACTS_DIAGNOSTIC_CODES,
  FACTS_UNFROZEN_GENERATION_CODE,
} from '../../../../constants/facts.js';
import {
  hashProjectFile,
  readAdjudicationTable,
  resolveFactsStorePaths,
} from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  AdjudicateDecisionInput,
  FactsAdjudicateData,
  FactsAdjudicateSummary,
  FactsCompareData,
  FactsCompareSummary,
  FactsStatusSummary,
} from '../../../../mcp/tools/facts/index.js';

import {
  cleanupFactsProjects,
  createFactsProject,
} from './helpers/createFactsProject.js';
import type { FactsProject } from './helpers/createFactsProject.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

const CONFIG = JSON.stringify({
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
  facts: { covers: ['src/**'] },
});

const INDEX_BODY = "export { thing } from './thing.js';\n";

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-adj-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': INDEX_BODY,
    'src/thing.ts': 'export const thing = 1;\n',
    '.filid/config.json': CONFIG,
  });
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
  cleanupFactsProjects();
});

/** The one edge every case in this file argues about. */
const EDGE = {
  kind: 'static',
  reference: './thing.js',
  resolvedPath: 'src/thing.ts',
} as const;

/**
 * Store a record for `src/index.ts` that carries no references.
 *
 * That record is what makes the candidate's edge a disagreement rather than
 * agreement: the store stands behind "this file references nothing".
 */
async function submitEmptyRecord(): Promise<void> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const file = project.submission(
    'empty.json',
    JSON.stringify([project.facts('src/index.ts')]),
  );
  await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * Compare a candidate that reports the edge, creating the side-table item.
 * @param generationId Generation to compare against, when a case needs one.
 * @returns The compare summary and data.
 */
async function compare(
  generationId?: string,
): Promise<{
  summary: FactsCompareSummary;
  data: FactsCompareData;
  codes: string[];
}> {
  const file = project.submission(
    `candidate-${Math.random().toString(36).slice(2)}.json`,
    JSON.stringify([
      project.facts('src/index.ts', {
        references: [
          {
            specifier: EDGE.reference,
            kind: EDGE.kind,
            resolved: { path: EDGE.resolvedPath },
          },
        ],
      }),
    ]),
  );
  const result = await handleFacts({
    action: 'compare',
    path: project.root,
    file,
    ...(generationId === undefined ? {} : { generationId }),
  });
  return {
    summary: result.summary as FactsCompareSummary,
    data: result.data as FactsCompareData,
    codes: result.diagnostics.map((diagnostic) => diagnostic.code),
  };
}

/**
 * Adjudicate the edge as one actor.
 * @param actor Who is deciding.
 * @param decision What they claim.
 * @param reason Why, for a dismissal.
 * @param contentHash Bytes to claim the judgement was made against.
 * @returns The adjudicate summary, data and diagnostic codes.
 */
async function adjudicate(
  actor: string,
  decision: AdjudicateDecisionInput['decision'],
  reason?: string,
  contentHash?: string,
): Promise<{
  summary: FactsAdjudicateSummary;
  data: FactsAdjudicateData;
  codes: string[];
}> {
  const current = hashProjectFile(project.root, 'src/index.ts');
  const result = await handleFacts({
    action: 'adjudicate',
    path: project.root,
    sourcePath: 'src/index.ts',
    contentHash:
      contentHash ?? (current.ok ? current.contentHash : 'sha256:unknown'),
    actor,
    items: [{ ...EDGE, decision, ...(reason === undefined ? {} : { reason }) }],
  });
  return {
    summary: result.summary as FactsAdjudicateSummary,
    data: result.data as FactsAdjudicateData,
    codes: result.diagnostics.map((diagnostic) => diagnostic.code),
  };
}

/**
 * Store a record for `src/index.ts` that carries the edge.
 *
 * A submission is the one input that settles an item without anybody judging
 * it: the store now stands behind the very edge the item was raised about.
 */
async function submitRecordWithEdge(): Promise<void> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const file = project.submission(
    'carries-edge.json',
    JSON.stringify([
      project.facts('src/index.ts', {
        references: [
          {
            specifier: EDGE.reference,
            kind: EDGE.kind,
            resolved: { path: EDGE.resolvedPath },
          },
        ],
      }),
    ]),
  );
  await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * Read the side table itself, since a settled item is invisible to `compare`.
 * @returns The stored state of the one edge, or null when the row is gone.
 */
function storedState(): string | null {
  const storePaths = resolveFactsStorePaths(project.root);
  const page = readAdjudicationTable(storePaths.sideTableDirectory).pages.get(
    storePaths.pathDigest('src/index.ts'),
  );
  return (
    page?.items.find(
      (item) =>
        item.reference === EDGE.reference &&
        item.resolvedPath === EDGE.resolvedPath,
    )?.state ?? null
  );
}

describe('facts compare', () => {
  it('records an edge the candidate has and the store does not', async () => {
    await submitEmptyRecord();

    const result = await compare();

    expect(result.summary.missingInStore).toBe(1);
    expect(result.summary.recordedItems).toBe(1);
    expect(result.data.missingInStore[0]).toMatchObject({
      path: 'src/index.ts',
      resolvedPath: EDGE.resolvedPath,
    });
  });

  it('keeps the item on the table across repeated comparisons', async () => {
    await submitEmptyRecord();
    await compare();

    const again = await compare();

    expect(again.summary.recordedItems).toBe(1);
  });

  it('answers a frozen-generation comparison with the fact that none exists', async () => {
    await submitEmptyRecord();

    // A well-formed id that names no generation: the answer under test is
    // "nothing is frozen for it", not "that is not an id".
    const result = await compare('a'.repeat(32));

    expect(result.codes).toEqual([FACTS_UNFROZEN_GENERATION_CODE]);
    expect(result.summary.comparedFiles).toBe(0);
  });
});

describe('facts adjudicate — the cells that need the store', () => {
  it('cell 19: refuses an item the table does not hold', async () => {
    await submitEmptyRecord();

    const result = await adjudicate('A', 'adopt');

    expect(result.data.refused[0]?.code).toBe(
      FACTS_ADJUDICATION_REFUSALS.NO_SUCH_ITEM,
    );
    expect(result.data.refused[0]?.nextAction).toContain('facts status');
  });

  it('cell 20: refuses a dismissal with no reason', async () => {
    await submitEmptyRecord();
    await compare();

    const result = await adjudicate('A', 'dismiss');

    expect(result.data.refused[0]?.code).toBe(
      FACTS_ADJUDICATION_REFUSALS.REASON_REQUIRED,
    );
  });

  it('cell 18: refuses a judgement made against bytes that have changed', async () => {
    await submitEmptyRecord();
    await compare();

    const result = await adjudicate('A', 'adopt', undefined, 'sha256:stale');

    expect(result.codes).toEqual([FACTS_ADJUDICATION_STALE_CODE]);
    expect(result.summary.applied).toBe(0);
  });

  it('adopts on one actor and keeps the edge', async () => {
    await submitEmptyRecord();
    await compare();

    const result = await adjudicate('A', 'adopt');

    expect(result.data.outcomes[0]).toMatchObject({
      state: FACTS_ADJUDICATION_STATES.ADOPTED,
      changed: true,
    });
  });

  it('holds a dismissal until a different actor confirms it', async () => {
    await submitEmptyRecord();
    await compare();

    const first = await adjudicate('A', 'dismiss', 'it is inside a comment');
    const repeat = await adjudicate('A', 'dismiss', 'it is inside a comment');
    const confirm = await adjudicate('B', 'dismiss', 'agreed, commented out');

    expect(first.data.outcomes[0]?.state).toBe(
      FACTS_ADJUDICATION_STATES.PENDING_DISMISS,
    );
    expect(repeat.summary.applied).toBe(0);
    expect(repeat.data.outcomes[0]?.nextAction).toContain('different actor');
    expect(confirm.data.outcomes[0]?.state).toBe(
      FACTS_ADJUDICATION_STATES.DISMISSED,
    );
  });

  it('cell 4: expires an unadjudicated item when the judged lines change', async () => {
    await submitEmptyRecord();
    await compare();
    expect(storedState()).toBe(FACTS_ADJUDICATION_STATES.UNADJUDICATED);

    // Nobody has judged it, so nothing is lost by dropping the row — and a
    // row about lines that are gone is one no actor could answer for.
    project.write('src/index.ts', "export { thing } from './other.js';\n");
    const after = await compare();

    expect(after.data.sideTableItems).toEqual([]);
    expect(storedState()).toBeNull();
  });

  it('cell 10: expires a judged item when the judged lines change', async () => {
    await submitEmptyRecord();
    await compare();
    await adjudicate('A', 'dismiss', 'it is inside a comment');

    project.write('src/index.ts', "export { thing } from './other.js';\n");
    const after = await compare();

    expect(after.data.sideTableItems).toEqual([]);
    expect(storedState()).toBeNull();
  });

  it('keeps a judgement when an unrelated line changes, and flags it once', async () => {
    await submitEmptyRecord();
    await compare();
    await adjudicate('A', 'adopt');

    project.write('src/index.ts', `// a new first line\n${INDEX_BODY}`);
    const after = await compare();

    expect(after.data.sideTableItems[0]).toMatchObject({
      state: FACTS_ADJUDICATION_STATES.ADOPTED,
      staleUnderNewContent: true,
    });
  });

  it('stops flagging the judgement once it is re-confirmed on the new bytes', async () => {
    await submitEmptyRecord();
    await compare();
    await adjudicate('A', 'adopt');
    project.write('src/index.ts', `// a new first line\n${INDEX_BODY}`);

    // Re-adjudicating against the current bytes re-stamps the item, so the
    // flag means "changed since it was judged" rather than "ever changed".
    await adjudicate('A', 'adopt');
    const after = await compare();

    expect(after.data.sideTableItems[0]).toMatchObject({
      state: FACTS_ADJUDICATION_STATES.ADOPTED,
      staleUnderNewContent: false,
    });
  });

  it('refuses to adopt an edge whose import line has been deleted', async () => {
    await submitEmptyRecord();
    await compare();
    project.write('src/index.ts', 'export const nothing = 1;\n');

    const result = await adjudicate('A', 'adopt');

    expect(result.data.refused[0]?.code).toBe(
      FACTS_ADJUDICATION_REFUSALS.NO_SUCH_ITEM,
    );
    expect(result.summary.applied).toBe(0);
  });

  it('cell 3: a submitted edge closes an item nobody judged', async () => {
    await submitEmptyRecord();
    await compare();

    await submitRecordWithEdge();

    expect(storedState()).toBe(FACTS_ADJUDICATION_STATES.CLOSED_BY_RECORD);
  });

  it('cell 9: a submitted edge closes an item awaiting confirmation', async () => {
    await submitEmptyRecord();
    await compare();
    await adjudicate('A', 'dismiss', 'it is inside a comment');

    await submitRecordWithEdge();

    expect(storedState()).toBe(FACTS_ADJUDICATION_STATES.CLOSED_BY_RECORD);
  });

  it('cell 22, adopted: a submitted edge leaves a judged item standing', async () => {
    await submitEmptyRecord();
    await compare();
    await adjudicate('A', 'adopt');

    await submitRecordWithEdge();

    // Closing it here would let two ordinary submissions — one carrying the
    // edge, the next dropping it — erase an actor's judgement with nothing
    // left to revive.
    expect(storedState()).toBe(FACTS_ADJUDICATION_STATES.ADOPTED);
  });

  it('cell 22, dismissed: the same holds once two actors have put it down', async () => {
    await submitEmptyRecord();
    await compare();
    await adjudicate('A', 'dismiss', 'it is inside a comment');
    await adjudicate('B', 'dismiss', 'agreed, commented out');
    expect(storedState()).toBe(FACTS_ADJUDICATION_STATES.DISMISSED);

    await submitRecordWithEdge();

    // A record carrying the edge does not overturn two actors who read the
    // line and said it is not one; only a fresh judgement does.
    expect(storedState()).toBe(FACTS_ADJUDICATION_STATES.DISMISSED);
  });

  it('cell 13: expires an adopted item when the judged lines change', async () => {
    await submitEmptyRecord();
    await compare();
    await adjudicate('A', 'adopt');
    expect(storedState()).toBe(FACTS_ADJUDICATION_STATES.ADOPTED);

    project.write('src/index.ts', "export { thing } from './other.js';\n");
    await compare();

    expect(storedState()).toBeNull();
  });

  it('cell 16: expires a dismissed item when the judged lines change', async () => {
    await submitEmptyRecord();
    await compare();
    await adjudicate('A', 'dismiss', 'it is inside a comment');
    await adjudicate('B', 'dismiss', 'agreed, commented out');
    expect(storedState()).toBe(FACTS_ADJUDICATION_STATES.DISMISSED);

    project.write('src/index.ts', "export { thing } from './other.js';\n");
    await compare();

    expect(storedState()).toBeNull();
  });

  it('answers facts-uninitialized when the scope covers nothing', async () => {
    project.write(
      '.filid/config.json',
      JSON.stringify({
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        facts: { covers: [] },
      }),
    );

    const result = await adjudicate('A', 'adopt');

    expect(result.codes).toEqual([FACTS_DIAGNOSTIC_CODES.UNINITIALIZED]);
  });
});
