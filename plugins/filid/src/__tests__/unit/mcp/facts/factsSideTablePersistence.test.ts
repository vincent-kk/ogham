import { mkdtempSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FACTS_DIAGNOSTIC_CODES } from '../../../../constants/facts.js';
import {
  readAdjudicationTable,
  resolveFactsStorePaths,
  writeAdjudicationPages,
} from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
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

const CONFIG = JSON.stringify({
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
  facts: { covers: ['src/**'] },
});

const BODY = "export { dep } from './dep.js';\n";

/** The one edge these cases argue about. */
const REF = {
  specifier: './dep.js',
  kind: 'static',
  resolved: { path: 'src/dep.ts' },
} as const;

/**
 * Two file names chosen so their path digests land in the SAME shard.
 *
 * Sharing a shard is the ordinary case, not a contrived one — 256 shards and a
 * batch of fifty files collide almost surely. These two make it deterministic.
 */
const SHARD_MATES = ['src/f9.ts', 'src/f19.ts'];

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-side-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/f9.ts': BODY,
    'src/f19.ts': BODY,
    'src/dep.ts': 'export const dep = 1;\n',
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
 * The project's current resolution epoch.
 * @returns The epoch as status reports it.
 */
async function epoch(): Promise<string> {
  const status = await handleFacts({ action: 'status', path: project.root });
  return (status.summary as FactsStatusSummary).resolutionEpoch;
}

/**
 * Submit records for the given files, with or without the edge.
 * @param paths Project-relative paths to submit records for.
 * @param withRef Whether each record carries the edge.
 * @param name Submission file name.
 * @returns The submit summary.
 */
async function submit(
  paths: readonly string[],
  withRef: boolean,
  name: string,
): Promise<FactsSubmitSummary> {
  const file = project.submission(
    name,
    JSON.stringify(
      paths.map((path) =>
        project.facts(path, { references: withRef ? [REF as never] : [] }),
      ),
    ),
  );
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: await epoch(),
  });
  return result.summary as FactsSubmitSummary;
}

/**
 * Compare a candidate that reports the edge for the given files.
 * @param paths Project-relative paths the candidate covers.
 */
async function compare(paths: readonly string[]): Promise<void> {
  await handleFacts({
    action: 'compare',
    path: project.root,
    file: project.submission(
      `candidate-${Math.random().toString(36).slice(2)}.json`,
      JSON.stringify(
        paths.map((path) => project.facts(path, { references: [REF as never] })),
      ),
    ),
  });
}

/**
 * Files the side table still holds unsettled work for.
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

describe('side-table writes within one call', () => {
  it('persists items for every compared file that shares a shard', async () => {
    await submit(SHARD_MATES, false, 'a.json');

    await compare(SHARD_MATES);

    expect(await unadjudicated()).toEqual(['src/f19.ts', 'src/f9.ts']);
  });

  it('persists items for every shrinking record in one batch', async () => {
    await submit(SHARD_MATES, true, 'a.json');

    const summary = await submit(SHARD_MATES, false, 'b.json');

    expect(summary.openedItems).toBe(2);
    expect(await unadjudicated()).toEqual(['src/f19.ts', 'src/f9.ts']);
  });
});

describe('a closed-by-record item', () => {
  it('returns as coverage-shrank when the edge is submitted away again', async () => {
    await submit(['src/f9.ts'], false, 'a.json');
    await compare(['src/f9.ts']);
    await submit(['src/f9.ts'], true, 'b.json');

    const summary = await submit(['src/f9.ts'], false, 'c.json');

    expect(summary.openedItems).toBe(1);
    expect(await unadjudicated()).toEqual(['src/f9.ts']);
  });
});

describe('two writers racing for one shard', () => {
  it('tells the loser, and keeps both items once it retries', async () => {
    await submit(SHARD_MATES, false, 'a.json');
    await compare(['src/f9.ts']);

    // The second writer read the table before the first one wrote, which is
    // what a concurrent subagent sees. Its stale token loses the shard.
    const table = readAdjudicationTable(
      resolveFactsStorePaths(project.root).sideTableDirectory,
    );
    await compare(['src/f19.ts']);
    const paths = resolveFactsStorePaths(project.root);
    const key = paths.pathDigest('src/f9.ts');
    const stale = writeAdjudicationPages(
      paths.sideTableDirectory,
      table,
      new Map([[key, { path: 'src/f9.ts', items: [] }]]),
      paths.shardFileName,
    );

    expect(stale.conflicted).toEqual(['src/f9.ts']);

    // The next action is to read again and repeat; doing so keeps both items.
    await compare(SHARD_MATES);
    expect(await unadjudicated()).toEqual(['src/f19.ts', 'src/f9.ts']);
  });
});

describe('an item whose file left the tree', () => {
  it('stops being listed as work the agent can do', async () => {
    await submit(['src/f9.ts'], false, 'a.json');
    await compare(['src/f9.ts']);

    unlinkSync(join(project.root, 'src', 'f9.ts'));

    expect(await unadjudicated()).toEqual([]);
  });

  it('stops being listed when the file leaves the declared scope', async () => {
    await submit(['src/f9.ts'], false, 'a.json');
    await compare(['src/f9.ts']);

    project.write(
      '.filid/config.json',
      JSON.stringify({
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        facts: { covers: ['src/f19.ts'] },
      }),
    );

    expect(await unadjudicated()).toEqual([]);
  });
});

describe('judgements that leave with their file', () => {
  it('reports how many went, without blocking the submission', async () => {
    await submit(['src/f9.ts'], false, 'a.json');
    await compare(['src/f9.ts']);
    const status = await handleFacts({ action: 'status', path: project.root });
    const item = (status.data as FactsStatusData).unadjudicated
      .items[0] as FactsOpenItem;
    await handleFacts({
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

    project.write(
      '.filid/config.json',
      JSON.stringify({
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        facts: { covers: ['src/f19.ts', 'src/dep.ts'] },
      }),
    );
    const file = project.submission(
      'after-scope.json',
      JSON.stringify([project.facts('src/f19.ts', { references: [] })]),
    );
    const result = await handleFacts({
      action: 'submit',
      path: project.root,
      file,
      resolutionEpoch: await epoch(),
    });

    // The removal is right and nothing is owed for it; an adopted edge
    // disappearing in silence is what the report exists to prevent.
    expect((result.summary as FactsSubmitSummary).removedAdjudicatedItems).toBe(
      1,
    );
    expect(result.diagnostics.map((one) => one.code)).toContain(
      FACTS_DIAGNOSTIC_CODES.ADJUDICATED_ITEMS_REMOVED,
    );
  });
});
