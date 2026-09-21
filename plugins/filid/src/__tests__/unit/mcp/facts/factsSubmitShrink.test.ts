import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FACTS_ADJUDICATION_STATES } from '../../../../constants/facts.js';
import {
  readAdjudicationTable,
  resolveFactsStorePaths,
  selectValidReferences,
} from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsCompareData,
  FactsOpenItem,
  FactsStatusData,
  FactsStatusSummary,
  FactsSubmitSummary,
} from '../../../../mcp/tools/facts/index.js';

import {
  cleanupFactsProjects,
  createFactsProject,
} from './helpers/createFactsProject.js';
import type { FactsProject } from './helpers/createFactsProject.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

const CONFIG = (facts: unknown): string =>
  JSON.stringify({
    version: '2.0',
    adapters: { mode: 'auto', enabled: [] },
    rules: {},
    facts,
  });

/** The reference every case here argues about; it is in the file's bytes. */
const REFERENCE = './thing.js';

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-shrink-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': `export { thing } from '${REFERENCE}';\n`,
    'src/thing.ts': 'export const thing = 1;\n',
    'src/other.ts': 'export const other = 1;\n',
    '.filid/config.json': CONFIG({ covers: ['src/**'] }),
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
 * @param tool Provenance tool name.
 * @returns The submit summary.
 */
async function submit(
  target: string | null,
  tool = 'tool-a',
): Promise<FactsSubmitSummary> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const record = project.facts('src/index.ts', {
    references:
      target === null
        ? []
        : [{ specifier: REFERENCE, kind: 'static', resolved: { path: target } }],
    provenance: {
      tool,
      version: '1.0.0',
      command: 'test',
      tier: 'tool',
      resolutionInputs: [],
    },
  });
  const file = project.submission(
    `batch-${Math.random().toString(36).slice(2)}.json`,
    JSON.stringify([record]),
  );
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
  return result.summary as FactsSubmitSummary;
}

/**
 * Submit one record for `src/pair.ts` claiming the given resolutions.
 * @param targets In-project paths the repeated reference resolves to.
 * @returns The submit summary.
 */
async function submitPair(
  targets: readonly { path: string }[],
): Promise<FactsSubmitSummary> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const record = project.facts('src/pair.ts', {
    references: targets.map((target) => ({
      specifier: REFERENCE,
      kind: 'static',
      resolved: { path: target.path },
    })),
    provenance: {
      tool: 'tool-a',
      version: '1.0.0',
      command: 'test',
      tier: 'tool',
      resolutionInputs: [],
    },
  });
  const file = project.submission(
    `pair-${Math.random().toString(36).slice(2)}.json`,
    JSON.stringify([record]),
  );
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
  return result.summary as FactsSubmitSummary;
}

/**
 * Files the side table still holds an unsettled item for.
 * @returns Project-relative paths, as status reports them.
 */
async function unadjudicated(): Promise<string[]> {
  const result = await handleFacts({ action: 'status', path: project.root });
  return [
    ...new Set(
      (result.data as FactsStatusData).unadjudicated.items.map(
        (item) => item.path,
      ),
    ),
  ];
}

describe('a submission that walks an edge back', () => {
  it('opens an item rather than shrinking the graph quietly', async () => {
    await submit('src/thing.ts');

    const summary = await submit(null);

    expect(summary.openedItems).toBe(1);
  });

  it('holds the file uncertain until the item is judged', async () => {
    await submit('src/thing.ts');
    await submit(null);

    const status = await handleFacts({ action: 'status', path: project.root });

    expect((status.data as FactsStatusData).uncertain.paths).toContain(
      'src/index.ts',
    );
  });

  it('opens an item when the replacement re-points the edge', async () => {
    await submit('src/thing.ts');

    const summary = await submit('src/other.ts');

    expect(summary.openedItems).toBe(1);
  });

  it('opens nothing when the same record is submitted again', async () => {
    await submit('src/thing.ts');

    const summary = await submit('src/thing.ts');

    expect(summary.openedItems).toBe(0);
  });

  it('cells 3 and 9: closes an open item when a later record carries the edge', async () => {
    await submit('src/thing.ts');
    await submit(null);
    expect(await unadjudicated()).toEqual(['src/index.ts']);

    const summary = await submit('src/thing.ts');

    expect(summary.closedItems).toBe(1);
    expect(await unadjudicated()).toEqual([]);
  });

  it('cells 13 and 16: expires the item when the judged lines change', async () => {
    await submit('src/thing.ts');
    await submit(null);

    project.write('src/index.ts', "export { thing } from './elsewhere.js';\n");
    await submit(null);

    expect(await unadjudicated()).toEqual([]);
  });
});

describe('the count rule separates an edit from a tool omission', () => {
  it('opens nothing when one of two imports of the same specifier is deleted', async () => {
    // Two imports, two resolutions — a type-only import beside a value one.
    project.write(
      'src/pair.ts',
      `import type { T } from '${REFERENCE}';\nimport { v } from '${REFERENCE}';\n`,
    );
    const both = await submitPair([
      { path: 'src/thing.ts' },
      { path: 'src/other.ts' },
    ]);
    expect(both.openedItems).toBe(0);

    // The type-only line goes; the record now claims the one that is left.
    project.write('src/pair.ts', `import { v } from '${REFERENCE}';\n`);
    const after = await submitPair([{ path: 'src/thing.ts' }]);

    expect(after.openedItems).toBe(0);
  });

  it('leaves an open item closed by the record that claims both targets', async () => {
    project.write(
      'src/pair.ts',
      `import type { T } from '${REFERENCE}';\nimport { v } from '${REFERENCE}';\n`,
    );
    await submitPair([{ path: 'src/thing.ts' }, { path: 'src/other.ts' }]);
    await submitPair([{ path: 'src/thing.ts' }]);
    expect(await unadjudicated()).toContain('src/pair.ts');

    const back = await submitPair([
      { path: 'src/thing.ts' },
      { path: 'src/other.ts' },
    ]);

    // The record carries the edge again, so the item is settled by the record
    // rather than reopened: reopening what the store now stands behind would
    // ask two actors to judge a claim nobody disputes.
    expect(back.openedItems).toBe(0);
    const storePaths = resolveFactsStorePaths(project.root);
    const page = readAdjudicationTable(storePaths.sideTableDirectory).pages.get(
      storePaths.pathDigest('src/pair.ts'),
    );
    expect(
      page?.items.map(({ resolvedPath, state }) => ({ resolvedPath, state })),
    ).toEqual([
      {
        resolvedPath: 'src/other.ts',
        state: FACTS_ADJUDICATION_STATES.CLOSED_BY_RECORD,
      },
    ]);
  });

  it('opens an item when both remain but the record claims only one', async () => {
    project.write(
      'src/pair.ts',
      `import type { T } from '${REFERENCE}';\nimport { v } from '${REFERENCE}';\n`,
    );
    await submitPair([{ path: 'src/thing.ts' }, { path: 'src/other.ts' }]);

    const after = await submitPair([{ path: 'src/thing.ts' }]);

    expect(after.openedItems).toBe(1);
  });
});

describe('facts.provider', () => {
  it('leaves a resolution disagreement judgeable when none is declared', async () => {
    await submit('src/thing.ts');
    const candidate = project.submission(
      'candidate.json',
      JSON.stringify([
        project.facts('src/index.ts', {
          references: [
            {
              specifier: REFERENCE,
              kind: 'static',
              resolved: { path: 'src/other.ts' },
            },
          ],
        }),
      ]),
    );

    const result = await handleFacts({
      action: 'compare',
      path: project.root,
      file: candidate,
    });

    expect((result.data as FactsCompareData).resolutionDiffers).toHaveLength(1);
  });

  it('demotes it to information when the store came from the declared provider', async () => {
    project.write(
      '.filid/config.json',
      CONFIG({ covers: ['src/**'], provider: 'tool-a' }),
    );
    await submit('src/thing.ts', 'tool-a');
    const candidate = project.submission(
      'candidate.json',
      JSON.stringify([
        project.facts('src/index.ts', {
          references: [
            {
              specifier: REFERENCE,
              kind: 'static',
              resolved: { path: 'src/other.ts' },
            },
          ],
        }),
      ]),
    );

    const result = await handleFacts({
      action: 'compare',
      path: project.root,
      file: candidate,
    });

    const data = result.data as FactsCompareData;
    expect(data.resolutionDiffers).toEqual([]);
    expect(data.informational).toHaveLength(1);
  });

  it('keeps it judgeable when the store came from some other tool', async () => {
    project.write(
      '.filid/config.json',
      CONFIG({ covers: ['src/**'], provider: 'tool-authoritative' }),
    );
    await submit('src/thing.ts', 'tool-a');
    const candidate = project.submission(
      'candidate.json',
      JSON.stringify([
        project.facts('src/index.ts', {
          references: [
            {
              specifier: REFERENCE,
              kind: 'static',
              resolved: { path: 'src/other.ts' },
            },
          ],
        }),
      ]),
    );

    const result = await handleFacts({
      action: 'compare',
      path: project.root,
      file: candidate,
    });

    expect((result.data as FactsCompareData).resolutionDiffers).toHaveLength(1);
  });
});

/**
 * Judge one open item as one actor.
 * @param item The item exactly as a response reported it.
 * @param decision What the actor claims.
 * @param actor Who claims it.
 * @returns Nothing; the side table holds the outcome afterwards.
 */
async function adjudicate(
  item: FactsOpenItem,
  decision: 'adopt' | 'dismiss',
  actor: string,
): Promise<void> {
  await handleFacts({
    action: 'adjudicate',
    path: project.root,
    sourcePath: item.path,
    contentHash: item.contentHash,
    actor,
    items: [
      {
        kind: item.kind,
        reference: item.reference,
        resolvedPath: item.resolvedPath,
        decision,
        ...(decision === 'dismiss' ? { reason: 'not a live import' } : {}),
      },
    ],
  });
}

/**
 * The one item the side table holds for `src/index.ts`.
 * @returns That item as stored, or undefined when the page is empty.
 */
function storedItem(): { state: string } | undefined {
  const paths = resolveFactsStorePaths(project.root);
  return readAdjudicationTable(paths.sideTableDirectory).pages.get(
    paths.pathDigest('src/index.ts'),
  )?.items[0];
}

describe('a record meeting a judgement that has already been made', () => {
  it('leaves the verdict standing and keeps the adopted edge', async () => {
    await submit('src/thing.ts');
    await submit(null);
    const result = await handleFacts({ action: 'status', path: project.root });
    const item = (result.data as FactsStatusData).unadjudicated
      .items[0] as FactsOpenItem;
    await adjudicate(item, 'adopt', 'reader-a');

    // Closing this by record would drop the adoption, and the next submission
    // to walk the edge back would find nothing to reopen — two ordinary
    // submissions erasing one actor's decision.
    await submit('src/thing.ts');

    expect(storedItem()?.state).toBe(FACTS_ADJUDICATION_STATES.ADOPTED);
    await submit(null);
    const paths = resolveFactsStorePaths(project.root);
    const page = readAdjudicationTable(paths.sideTableDirectory).pages.get(
      paths.pathDigest('src/index.ts'),
    );
    expect(
      selectValidReferences([], page, 'src/index.ts').map(
        (edge) => edge.resolvedPath,
      ),
    ).toEqual(['src/thing.ts']);
  });
});

/**
 * Submit one record for `src/deep/use.ts` claiming one specifier.
 * @param specifier Reference text, as the file now spells it.
 * @param target In-project path it resolves to.
 * @returns The submit summary.
 */
async function submitDeep(
  specifier: string,
  target: string,
): Promise<FactsSubmitSummary> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const record = project.facts('src/deep/use.ts', {
    references: [{ specifier, kind: 'static', resolved: { path: target } }],
    provenance: {
      tool: 'tool-a',
      version: '1.0.0',
      command: 'test',
      tier: 'tool',
      resolutionInputs: [],
    },
  });
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file: project.submission(
      `deep-${Math.random().toString(36).slice(2)}.json`,
      JSON.stringify([record]),
    ),
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
  return result.summary as FactsSubmitSummary;
}

describe('a rewritten specifier that spells the old one inside itself', () => {
  it('opens no item when only the new specifier is on the line', async () => {
    project.write('src/c/index.ts', 'export const x = 1;\n');
    project.write('c/index.ts', 'export const x = 2;\n');
    project.write(
      'src/deep/use.ts',
      "export { x } from '../c/index.js';\n",
    );
    await submitDeep('../c/index.js', 'src/c/index.ts');
    // The restructure a caller runs: the unit moved up, so the specifier grew
    // a segment and the old one survives only as a substring of the new one.
    project.write(
      'src/deep/use.ts',
      "export { x } from '../../c/index.js';\n",
    );

    const summary = await submitDeep('../../c/index.js', 'c/index.ts');

    expect(summary.openedItems).toBe(0);
    expect(await unadjudicated()).toEqual([]);
  });
});

describe('a tree that moved between two records of the same tool', () => {
  it('still opens an item for an edge the new record stopped claiming', async () => {
    await submit('src/thing.ts');
    project.write('src/added.ts', 'export const added = 1;\n');

    // The epoch explains where a string resolves, never whether the string is a
    // reference at all. Exempting this would hide every tool omission behind
    // any unrelated file being added.
    const summary = await submit(null);

    expect(summary.openedItems).toBe(1);
  });

  it('still exempts an edge the new record re-points', async () => {
    await submit('src/thing.ts');
    project.write('src/added.ts', 'export const added = 1;\n');

    const summary = await submit('src/other.ts');

    expect(summary.openedItems).toBe(0);
  });
});
