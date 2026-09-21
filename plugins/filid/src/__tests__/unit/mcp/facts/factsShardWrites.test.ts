import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FACTS_ACTIONS,
  FACTS_DIAGNOSTIC_CODES,
} from '../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { resolveFactsStorePaths } from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsCompareData,
  FactsSubmitSummary,
} from '../../../../mcp/tools/facts/index.js';

import {
  cleanupFactsProjects,
  createFactsProject,
} from './helpers/createFactsProject.js';
import type { FactsProject } from './helpers/createFactsProject.js';

/**
 * Every shard write the tool performs, and whether it is allowed to land.
 *
 * The module is mocked rather than the filesystem so the assertion is about the
 * batching the tool does — one write per shard — which no on-disk state reveals.
 */
const shardWrites = vi.hoisted(() => ({
  names: [] as string[],
  failAll: false,
}));

/** Whether the side table is allowed to keep the pages a call plans for it. */
const pageWrites = vi.hoisted(() => ({ failAll: false }));

/** Whether the pending store is allowed to keep the pages a call plans for it. */
const pendingWrites = vi.hoisted(() => ({ failAll: false }));

vi.mock('../../../../core/facts/index.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../core/facts/index.js')>();
  return {
    ...actual,
    writeAdjudicationPages: (
      directory: string,
      table: Parameters<typeof actual.writeAdjudicationPages>[1],
      updates: Parameters<typeof actual.writeAdjudicationPages>[2],
      shardFileName: (digest: string) => string,
    ): ReturnType<typeof actual.writeAdjudicationPages> =>
      pageWrites.failAll
        ? {
            stored: new Set<string>(),
            conflicted: [...updates.values()].map((update) => update.path),
            damaged: [] as string[],
            shards: new Map(),
          }
        : actual.writeAdjudicationPages(
            directory,
            table,
            updates,
            shardFileName,
          ),
    writeShardPages: (
      directory: string,
      shards: Parameters<typeof actual.writeShardPages>[1],
      updates: Parameters<typeof actual.writeShardPages>[2],
      shardFileName: (digest: string) => string,
      damaged: Parameters<typeof actual.writeShardPages>[4],
    ): ReturnType<typeof actual.writeShardPages> =>
      pendingWrites.failAll
        ? {
            stored: new Set<string>(),
            conflicted: [...updates.values()].map((update) => update.path),
            damaged: [] as string[],
            shards: new Map(),
          }
        : actual.writeShardPages(
            directory,
            shards,
            updates,
            shardFileName,
            damaged,
          ),
    writeFactsShardFile: (
      directory: string,
      shardFileName: string,
      entries: Record<string, unknown>,
      expectedDigest: string | null,
    ): string | null => {
      shardWrites.names.push(shardFileName);
      if (shardWrites.failAll) return null;
      return actual.writeFactsShardFile(
        directory,
        shardFileName,
        entries,
        expectedDigest,
      );
    },
  };
});

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

const CONFIG = JSON.stringify({
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
  facts: { covers: ['src/**'] },
});

/** Files that land in one shard are unknown up front, so use many. */
const SOURCE_FILES = Array.from({ length: 24 }, (_, index) => index);

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  shardWrites.names = [];
  shardWrites.failAll = false;
  pageWrites.failAll = false;
  pendingWrites.failAll = false;
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-shard-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    '.filid/config.json': CONFIG,
    'src/edge.ts': "export { value1 } from './file1.js';\n",
    ...Object.fromEntries(
      SOURCE_FILES.map((index) => [
        `src/file${index}.ts`,
        `export const value${index} = ${index};\n`,
      ]),
    ),
  });
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
  cleanupFactsProjects();
});

/**
 * Read the project's current resolution epoch.
 * @returns The epoch as `status` reports it.
 */
async function currentEpoch(): Promise<string> {
  const result = await handleFacts({ action: 'status', path: project.root });
  return (result.summary as { resolutionEpoch: string }).resolutionEpoch;
}

/**
 * Submit records for every source file in one batch.
 * @param epoch Epoch to submit against; defaults to the current one.
 * @returns The submit summary, envelope status and diagnostic codes.
 */
async function submitAll(epoch?: string): Promise<{
  summary: FactsSubmitSummary;
  status: string;
  codes: string[];
}> {
  const resolutionEpoch = epoch ?? (await currentEpoch());
  const file = project.submission(
    `batch-${Math.random().toString(36).slice(2)}.json`,
    JSON.stringify(
      SOURCE_FILES.map((index) => project.facts(`src/file${index}.ts`)),
    ),
  );
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch,
  });
  return {
    summary: result.summary as FactsSubmitSummary,
    status: result.status,
    codes: result.diagnostics.map((diagnostic) => diagnostic.code),
  };
}

/**
 * Record two epoch movements so the drift counter holds a sequence.
 * @param stale An epoch already out of date.
 */
async function driveDrift(stale: string): Promise<void> {
  for (const name of ['a', 'b']) {
    project.write(`src/moved-${name}.ts`, 'export const moved = 1;\n');
    await submitAll(stale);
  }
}

/**
 * The epoch sequence the drift counter currently holds.
 * @returns Stored epochs, or an empty list when no counter file exists.
 */
function storedDrift(): string[] {
  try {
    return (
      JSON.parse(
        readFileSync(resolveFactsStorePaths(project.root).driftPath, 'utf8'),
      ) as { epochs: string[] }
    ).epochs;
  } catch {
    return [];
  }
}

describe('facts submit shard batching', () => {
  it('writes each touched shard exactly once for a whole batch', async () => {
    const result = await submitAll();

    expect(result.summary.accepted).toBe(SOURCE_FILES.length);
    expect(shardWrites.names).toHaveLength(new Set(shardWrites.names).size);
    expect(shardWrites.names.length).toBeLessThan(SOURCE_FILES.length);
  });

  it('groups records that share a shard into that one write', async () => {
    const paths = resolveFactsStorePaths(project.root);
    const shards = SOURCE_FILES.map((index) =>
      paths.shardFileName(paths.pathDigest(`src/file${index}.ts`)),
    );

    await submitAll();

    expect(new Set(shardWrites.names)).toEqual(new Set(shards));
  });
});

describe('facts submit under a lost compare-and-set', () => {
  it('reports facts-record-changed and stores nothing', async () => {
    shardWrites.failAll = true;

    const result = await submitAll();

    expect(result.summary.accepted).toBe(0);
    expect(result.status).toBe(TOOL_STATUSES.INDETERMINATE);
    expect(result.codes).toEqual([FACTS_DIAGNOSTIC_CODES.RECORD_CHANGED]);
  });

  it('leaves the drift counter alone when nothing landed', async () => {
    await driveDrift(await currentEpoch());
    const recorded = storedDrift();
    expect(recorded.length).toBe(2);
    shardWrites.failAll = true;

    const result = await submitAll();

    expect(result.summary.accepted).toBe(0);
    expect(storedDrift()).toEqual(recorded);
  });

  it('clears the drift counter when records do land', async () => {
    await driveDrift(await currentEpoch());
    expect(storedDrift().length).toBe(2);

    const result = await submitAll();

    expect(result.summary.accepted).toBe(SOURCE_FILES.length);
    expect(storedDrift()).toEqual([]);
  });
});

/**
 * Submit one record for `src/edge.ts`, with or without its edge.
 * @param withEdge Whether the record claims the import in the file.
 * @returns The submit summary, envelope status and diagnostic codes.
 */
async function submitEdge(withEdge: boolean): Promise<{
  summary: FactsSubmitSummary;
  status: string;
  codes: string[];
  nextActions: string[];
}> {
  const resolutionEpoch = await currentEpoch();
  const file = project.submission(
    `edge-${Math.random().toString(36).slice(2)}.json`,
    JSON.stringify([
      project.facts('src/edge.ts', {
        references: withEdge
          ? [
              {
                specifier: './file1.js',
                kind: 'static',
                resolved: { path: 'src/file1.ts' },
              },
            ]
          : [],
      }),
    ]),
  );
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch,
  });
  return {
    summary: result.summary as FactsSubmitSummary,
    status: result.status,
    codes: result.diagnostics.map((diagnostic) => diagnostic.code),
    nextActions: result.diagnostics.map((diagnostic) => diagnostic.nextAction),
  };
}

/**
 * How many items the side table still holds unsettled.
 * @returns The count `status` reports.
 */
async function openItemCount(): Promise<number> {
  const result = await handleFacts({ action: 'status', path: project.root });
  return (result.summary as { unadjudicatedItems: number }).unadjudicatedItems;
}

describe('facts submit under a lost side-table page', () => {
  it('reports the loss and counts no item it did not store', async () => {
    await submitEdge(true);
    pageWrites.failAll = true;

    // The record landed and the item that would have shown the narrowing did
    // not. Reporting OK here would be a graph quietly one edge smaller.
    const result = await submitEdge(false);

    expect(result.summary.openedItems).toBe(0);
    expect(result.status).toBe(TOOL_STATUSES.INDETERMINATE);
    expect(result.codes).toContain(
      FACTS_DIAGNOSTIC_CODES.SIDE_TABLE_CHANGED,
    );
    // The recovery is this action's own work, not the comparison's.
    expect(result.nextActions.join(' ')).toContain('submit those files again');
  });

  it('stores no record whose opening page was refused', async () => {
    await submitEdge(true);
    pageWrites.failAll = true;

    const result = await submitEdge(false);

    // Storing the narrower record here makes the retry compare it with itself,
    // so the edge is walked back with nothing left to open an item against.
    expect(result.summary.accepted).toBe(0);
  });

  it('opens the item on the retry, which is the same call', async () => {
    await submitEdge(true);
    pageWrites.failAll = true;
    await submitEdge(false);
    pageWrites.failAll = false;

    const retry = await submitEdge(false);

    expect(retry.summary.openedItems).toBe(1);
    expect(await openItemCount()).toBe(1);
  });
});

describe('facts submit whose item outlives a lost record', () => {
  it('keeps the file uncertain when the record did not land', async () => {
    await submitEdge(true);
    shardWrites.failAll = true;

    const result = await submitEdge(false);

    expect(result.summary.accepted).toBe(0);
    expect(result.summary.openedItems).toBe(1);
    expect(await openItemCount()).toBe(1);
  });

  it('closes that item by a later record that carries the edge', async () => {
    await submitEdge(true);
    shardWrites.failAll = true;
    await submitEdge(false);
    shardWrites.failAll = false;

    const result = await submitEdge(true);

    expect(result.summary.closedItems).toBe(1);
    expect(await openItemCount()).toBe(0);
  });
});

describe('facts submit under a lost record shard', () => {
  it('leaves the judgements untouched when the record did not land', async () => {
    await submitEdge(true);
    await submitEdge(false);
    const open = await openItemCount();
    expect(open).toBe(1);
    shardWrites.failAll = true;

    // The edge is back, so this submit would close the item by record. The
    // record cannot land, and a closed item over a record that is not there
    // would settle the file on evidence the store does not hold.
    const result = await submitEdge(true);

    expect(result.summary.accepted).toBe(0);
    expect(await openItemCount()).toBe(1);
  });
});

describe('facts compare under a lost side-table page', () => {
  it('refuses instead of reporting a comparison whose items did not land', async () => {
    await submitEdge(true);
    pageWrites.failAll = true;
    const file = project.submission(
      'candidate.json',
      JSON.stringify([project.facts('src/edge.ts', { references: [] })]),
    );

    const result = await handleFacts({
      action: 'compare',
      path: project.root,
      file,
    });

    expect(result.status).toBe(TOOL_STATUSES.INDETERMINATE);
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      FACTS_DIAGNOSTIC_CODES.SIDE_TABLE_CHANGED,
    );
    expect(result.diagnostics[0]?.nextAction).toContain('compare again');
  });

  it('names the files whose items were not recorded', async () => {
    await submitEdge(true);
    pageWrites.failAll = true;
    const file = project.submission(
      'candidate.json',
      JSON.stringify([project.facts('src/edge.ts', { references: [] })]),
    );

    const result = await handleFacts({
      action: 'compare',
      path: project.root,
      file,
    });

    // The buckets say what the comparison found; without this list nothing in
    // the data says which of those findings the store now holds.
    expect((result.data as FactsCompareData).unrecorded?.paths).toEqual([
      'src/edge.ts',
    ]);
  });
});

/**
 * Leave one unconfirmed attested submission in the pending store.
 *
 * `discard-pending` needs something to discard, and only a first attested
 * submission puts a page there.
 */
async function openOnePendingAttestation(): Promise<void> {
  const bytes = readFileSync(join(project.root, 'src/edge.ts'));
  const status = await currentEpoch();
  await handleFacts({
    action: 'submit',
    path: project.root,
    file: project.submission(
      'attested.json',
      JSON.stringify([
        {
          schemaVersion: 1,
          path: 'src/edge.ts',
          contentHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
          references: [],
          nonReferences: [{ line: 1, reason: 'the import is re-exported' }],
          provenance: {
            tool: 'reader',
            version: '1.0.0',
            command: 'read',
            tier: 'attested',
            resolutionInputs: [],
          },
        },
      ]),
    ),
    resolutionEpoch: status,
    actor: 'first-reader',
  });
}

describe('facts discard-pending under a lost pending page', () => {
  it('asks for the discard again, not for the record it was discarding', async () => {
    await openOnePendingAttestation();
    pendingWrites.failAll = true;

    const result = await handleFacts({
      action: 'discard-pending',
      path: project.root,
      sourcePaths: ['src/edge.ts'],
    });

    expect(result.status).toBe(TOOL_STATUSES.INDETERMINATE);
    // Telling this caller to submit the attested record again is the opposite
    // of what it asked for: the record is the thing it is throwing away.
    const [diagnostic] = result.diagnostics;
    expect(diagnostic?.code).toBe(FACTS_DIAGNOSTIC_CODES.PENDING_CHANGED);
    expect(diagnostic?.nextAction).toContain(FACTS_ACTIONS.DISCARD_PENDING);
    expect(diagnostic?.nextAction).not.toContain('submit those attested');
  });
});
