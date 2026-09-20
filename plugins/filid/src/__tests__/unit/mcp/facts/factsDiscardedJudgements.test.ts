import {
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FACTS_ADJUDICATION_ORIGINS,
  FACTS_FILE_STATES,
  FACTS_UNKNOWN_CAUSES,
} from '../../../../constants/facts.js';
import {
  classifyProjectFacts,
  readProjectFacts,
  resolveFactsStorePaths,
} from '../../../../core/facts/index.js';
import { createDefaultConfig } from '../../../../core/infra/configLoader/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsCompareData,
  FactsStatusData,
  FactsStatusSummary,
} from '../../../../mcp/tools/facts/index.js';

import {
  cleanupFactsProjects,
  createFactsProject,
} from './helpers/createFactsProject.js';
import type { FactsProject } from './helpers/createFactsProject.js';

/** The edge the discarded judgements were about. */
const EDGE = {
  specifier: './thing.js',
  kind: 'static' as const,
  resolved: { path: 'src/thing.ts' },
};

/** The tool that wrote every stored record here. */
const STORED_TOOL = 'tool-a';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-discarded-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': "export { thing } from './thing.js';\n",
    'src/thing.ts': 'export const thing = 1;\n',
    '.filid/config.json': JSON.stringify({
      version: '2.0',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
      facts: { covers: ['src/**'] },
    }),
  });
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
  cleanupFactsProjects();
});

/**
 * One record of `src/index.ts` from a named tool.
 * @param references What the record claims.
 * @param tool `provenance.tool` the record declares.
 * @returns The record, hashed against the file on disk.
 */
function record(references: (typeof EDGE)[], tool = STORED_TOOL) {
  return project.facts('src/index.ts', {
    references,
    provenance: {
      tool,
      version: '1.0.0',
      command: 'test',
      tier: 'tool',
      resolutionInputs: [],
    },
  });
}

/**
 * Store one record for `src/index.ts`.
 * @param references What the record claims.
 */
async function submit(references: (typeof EDGE)[]): Promise<void> {
  const status = await handleFacts({ action: 'status', path: project.root });
  await handleFacts({
    action: 'submit',
    path: project.root,
    file: project.submission(
      `batch-${Math.random().toString(36).slice(2)}.json`,
      JSON.stringify([record(references)]),
    ),
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * Compare one candidate for `src/index.ts` against the store.
 * @param references What the candidate claims.
 * @param tool `provenance.tool` the candidate declares.
 * @returns The compare payload.
 */
function compare(references: (typeof EDGE)[], tool: string) {
  return handleFacts({
    action: 'compare',
    path: project.root,
    file: project.submission(
      `candidate-${Math.random().toString(36).slice(2)}.json`,
      JSON.stringify([record(references, tool)]),
    ),
  });
}

/**
 * The state model's answer for `src/index.ts`, read the way analysis reads it.
 * @returns That file's facts state.
 */
async function stateOfIndex(): Promise<string | undefined> {
  const facts = await readProjectFacts(project.root, {
    ...createDefaultConfig(),
    facts: { covers: ['src/**'] },
  });
  return classifyProjectFacts(project.root, facts).get('src/index.ts');
}

/**
 * Adopt the one open item `status` reports, as one actor.
 * @returns Nothing; the side table holds the outcome afterwards.
 */
async function adoptTheOpenItem(): Promise<void> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const item = (status.data as FactsStatusData).unadjudicated.items[0];
  if (item === undefined) throw new Error('no open item to adopt');
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
}

/**
 * Adopt an edge, then make the shard that holds the adoption unparseable.
 *
 * This is the loss the discard has to account for: the record does not carry
 * the edge, only the adopted item did, and nothing on disk says so afterwards.
 *
 * @returns The damaged shard's file name.
 */
async function adoptThenDamage(): Promise<string> {
  await submit([EDGE]);
  await submit([]);
  await adoptTheOpenItem();
  const directory = resolveFactsStorePaths(project.root).sideTableDirectory;
  const [shard] = readdirSync(directory).filter((name) =>
    name.endsWith('.json'),
  );
  writeFileSync(join(directory, shard as string), '{ not json');
  return shard as string;
}

/**
 * Discard the damaged shard, having checked that status named it first.
 * @param shard The shard file name to discard.
 */
async function discard(shard: string): Promise<void> {
  const before = await handleFacts({ action: 'status', path: project.root });
  expect(
    before.diagnostics.map((diagnostic) => diagnostic.message).join(' '),
  ).toContain(shard);
  await handleFacts({
    action: 'discard-damaged',
    path: project.root,
    shards: [shard],
  });
}

describe('a file whose judgements were discarded is not settled by the discard', () => {
  it('stays uncertain and says what would re-derive what was lost', async () => {
    const shard = await adoptThenDamage();

    await discard(shard);

    expect(await stateOfIndex()).toBe(FACTS_FILE_STATES.UNCERTAIN);
    const status = await handleFacts({ action: 'status', path: project.root });
    const data = status.data as FactsStatusData;
    expect(data.awaitingComparison.items).toContainEqual(
      expect.objectContaining({ path: 'src/index.ts', storedTool: STORED_TOOL }),
    );
    expect(data.uncertain.paths).toContain('src/index.ts');
    expect(
      status.diagnostics.find(
        (diagnostic) =>
          diagnostic.code === FACTS_UNKNOWN_CAUSES.JUDGEMENTS_DISCARDED,
      )?.nextAction,
    ).toContain('compare');
  });

  it('is not cleared by the tool that wrote the record it would reproduce', async () => {
    const shard = await adoptThenDamage();
    await discard(shard);

    const result = await compare([EDGE], STORED_TOOL);

    expect(result.diagnostics.map(({ code }) => code)).toContain(
      'facts-comparison-not-independent',
    );
    expect(await stateOfIndex()).toBe(FACTS_FILE_STATES.UNCERTAIN);
    const status = await handleFacts({ action: 'status', path: project.root });
    expect(
      (status.data as FactsStatusData).awaitingComparison.items.map(
        (item) => item.path,
      ),
    ).toContain('src/index.ts');
  });

  it('is cleared by another provenance, which reopens the lost edge', async () => {
    const shard = await adoptThenDamage();
    await discard(shard);

    const result = await compare([EDGE], 'tool-b');

    expect((result.data as FactsCompareData).missingInStore).toHaveLength(1);
    const status = await handleFacts({ action: 'status', path: project.root });
    const data = status.data as FactsStatusData;
    expect(data.awaitingComparison.items).toEqual([]);
    expect(data.unadjudicated.items).toContainEqual(
      expect.objectContaining({
        path: 'src/index.ts',
        resolvedPath: 'src/thing.ts',
        origin: FACTS_ADJUDICATION_ORIGINS.MISSING_IN_STORE,
      }),
    );
  });

  it('leaves uncertain once the reopened edge is adjudicated', async () => {
    const shard = await adoptThenDamage();
    await discard(shard);
    await compare([EDGE], 'tool-b');

    await adoptTheOpenItem();

    expect(await stateOfIndex()).toBe(FACTS_FILE_STATES.EXACT);
  });
});
