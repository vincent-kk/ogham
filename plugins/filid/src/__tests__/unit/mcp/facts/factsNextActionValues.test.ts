import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FACTS_ADJUDICATION_ACTOR_CODE,
  FACTS_ADJUDICATION_STALE_CODE,
  FACTS_ADJUDICATION_STATES,
} from '../../../../constants/facts.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsAdjudicateData,
  FactsAdjudicateSummary,
  FactsCompareData,
  FactsOpenItem,
  FactsStatusData,
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

/** The reference every case here argues about; it is in the file's bytes. */
const REFERENCE = './thing.js';

const BODY = `export { thing } from '${REFERENCE}';\n`;

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-next-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': BODY,
    'src/thing.ts': 'export const thing = 1;\n',
    'src/other.ts': 'export const other = 1;\n',
    '.filid/config.json': CONFIG,
  });
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
  cleanupFactsProjects();
});

/**
 * Submit one record for `src/index.ts`.
 * @param target In-project path the reference resolves to, or null to drop it.
 * @returns Nothing; the store holds that record afterwards.
 */
async function submit(target: string | null): Promise<void> {
  const before = await handleFacts({ action: 'status', path: project.root });
  const file = project.submission(
    `batch-${Math.random().toString(36).slice(2)}.json`,
    JSON.stringify([
      project.facts('src/index.ts', {
        references:
          target === null
            ? []
            : [
                {
                  specifier: REFERENCE,
                  kind: 'static',
                  resolved: { path: target },
                },
              ],
      }),
    ]),
  );
  await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (before.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * Every open item, exactly as `status` hands it to a caller.
 * @returns The open items the response carries.
 */
async function openItems(): Promise<FactsOpenItem[]> {
  const result = await handleFacts({ action: 'status', path: project.root });
  return (result.data as FactsStatusData).unadjudicated.items;
}

/**
 * Open one `coverage-shrank` item by submitting the edge and then dropping it.
 * @returns The item as the response reports it.
 */
async function openOneItem(): Promise<FactsOpenItem> {
  await submit('src/thing.ts');
  await submit(null);
  return (await openItems())[0] as FactsOpenItem;
}

/**
 * Submit a record for `src/pair.ts` claiming the given specifiers.
 * @param specifiers Specifiers the record claims, each resolving in-project.
 * @returns Nothing; the store holds that record afterwards.
 */
async function submitPair(specifiers: readonly string[]): Promise<void> {
  const before = await handleFacts({ action: 'status', path: project.root });
  const file = project.submission(
    `pair-${Math.random().toString(36).slice(2)}.json`,
    JSON.stringify([
      project.facts('src/pair.ts', {
        references: specifiers.map((specifier) => ({
          specifier,
          kind: 'static',
          resolved: { path: specifier === REFERENCE ? 'src/thing.ts' : 'src/other.ts' },
        })),
      }),
    ]),
  );
  await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (before.summary as FactsStatusSummary).resolutionEpoch,
  });
}

describe('what a response has to carry for its next action to work', () => {
  it('hands an item back with everything adjudicate needs, from status alone', async () => {
    const item = await openOneItem();

    // Nothing here is invented: every value comes out of the response. An
    // answer that named only the file would leave the caller guessing the key.
    const result = await handleFacts({
      action: 'adjudicate',
      path: project.root,
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

    expect(item.lines).toEqual([1]);
    expect((result.summary as FactsAdjudicateSummary).applied).toBe(1);
    expect((result.data as FactsAdjudicateData).refused).toEqual([]);
    expect(await openItems()).toEqual([]);
  });

  it('carries an item a comparison did not derive for itself', async () => {
    const item = await openOneItem();

    // The candidate agrees with the store — it reports no edge either — so the
    // comparison produces nothing. The open item is still the caller's work.
    const file = project.submission(
      'candidate.json',
      JSON.stringify([project.facts('src/index.ts', { references: [] })]),
    );
    const result = await handleFacts({
      action: 'compare',
      path: project.root,
      file,
    });

    expect((result.data as FactsCompareData).sideTableItems).toMatchObject([
      {
        reference: item.reference,
        resolvedPath: item.resolvedPath,
        state: FACTS_ADJUDICATION_STATES.UNADJUDICATED,
        contentHash: item.contentHash,
      },
    ]);
  });

  it('stops listing an item once the lines it was opened over change', async () => {
    const item = await openOneItem();
    project.write('src/index.ts', `// ${BODY}`);

    // adjudicate drops the item on the way in, so listing it would send the
    // caller to a refusal that calling status again cannot lift.
    const result = await handleFacts({
      action: 'adjudicate',
      path: project.root,
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

    expect(await openItems()).toEqual([]);
    expect(result.diagnostics[0]?.code).toBe(FACTS_ADJUDICATION_STALE_CODE);
    // The action it names has to be one that actually hands back a contentHash.
    expect(result.diagnostics[0]?.nextAction).toContain('facts status');
  });

  it('refuses an empty actor under its own code, not the stale-bytes one', async () => {
    const item = await openOneItem();

    const result = await handleFacts({
      action: 'adjudicate',
      path: project.root,
      sourcePath: item.path,
      contentHash: item.contentHash,
      actor: '   ',
      items: [
        {
          kind: item.kind,
          reference: item.reference,
          resolvedPath: item.resolvedPath,
          decision: 'adopt',
        },
      ],
    });

    expect(result.diagnostics[0]?.code).toBe(FACTS_ADJUDICATION_ACTOR_CODE);
    expect(result.diagnostics[0]?.nextAction).toContain('actor');
  });
});

describe('the staleness flag after a partial re-judgement', () => {
  it('clears only for the item this call actually judged', async () => {
    const pair = `export { thing } from '${REFERENCE}';\nexport { other } from './other.js';\n`;
    project.write('src/pair.ts', pair);
    await submitPair([REFERENCE, './other.js']);
    await submitPair([]);
    const judged = (await openItems()).find(
      (item) => item.reference === REFERENCE,
    ) as FactsOpenItem;

    // An unrelated first line: both items survive, both were judged against
    // bytes that no longer hash the same.
    project.write('src/pair.ts', `// a new first line\n${pair}`);
    const current = (await openItems()).find(
      (item) => item.reference === judged.reference,
    ) as FactsOpenItem;
    await handleFacts({
      action: 'adjudicate',
      path: project.root,
      sourcePath: current.path,
      contentHash: current.contentHash,
      actor: 'reader-a',
      items: [
        {
          kind: current.kind,
          reference: current.reference,
          resolvedPath: current.resolvedPath,
          decision: 'adopt',
        },
      ],
    });

    // Clearing the other item's flag would claim a reading nobody did.
    const file = project.submission(
      'pair-candidate.json',
      JSON.stringify([project.facts('src/pair.ts', { references: [] })]),
    );
    const result = await handleFacts({
      action: 'compare',
      path: project.root,
      file,
    });
    const items = (result.data as FactsCompareData).sideTableItems;

    expect(
      items.find((item) => item.reference === REFERENCE)
        ?.staleUnderNewContent,
    ).toBe(false);
    expect(
      items.find((item) => item.reference === './other.js')
        ?.staleUnderNewContent,
    ).toBe(true);
  });
});
