import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createServer } from '../../../mcp/server/lifecycle/createServer.js';
import type {
  FactsStatusData,
  FactsStatusSummary,
  FactsSubmitSummary,
} from '../../../mcp/tools/facts/index.js';
import {
  cleanupFactsProjects,
  createFactsProject,
} from '../../unit/mcp/facts/helpers/createFactsProject.js';
import type { FactsProject } from '../../unit/mcp/facts/helpers/createFactsProject.js';
import { connectTestClient } from '../helpers/connectTestClient.js';

import { callFactsThroughTransport } from './helpers/callFactsThroughTransport.js';
import type { FactsEnvelope } from './helpers/callFactsThroughTransport.js';

/** Facts scope of every project in this file. */
const CONFIG = JSON.stringify({
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
  facts: { covers: ['src/**'] },
});

/** Value of `CLAUDE_CONFIG_DIR` before a case redirected the store. */
const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

let stateRoot: string;
let project: FactsProject;
let connection: Awaited<ReturnType<typeof connectTestClient>>;

beforeEach(async () => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-adversarial-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': "export { thing } from './thing.js';\n",
    'src/thing.ts': 'export const thing = 1;\n',
    '.filid/config.json': CONFIG,
  });
  connection = await connectTestClient(createServer());
});

afterEach(async () => {
  await connection.close();
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
  cleanupFactsProjects();
});

/** Ask the tool, through the transport, what it is waiting for. */
const status = (): Promise<FactsEnvelope> =>
  callFactsThroughTransport(connection, {
    action: 'status',
    path: project.root,
  });

/**
 * Submit one batch of records against the epoch status currently reports.
 * @param name Submission file name, unique within one case.
 * @param records Records exactly as an extractor would serialize them.
 * @returns The submit envelope.
 */
async function submit(
  name: string,
  records: unknown[],
): Promise<FactsEnvelope> {
  const current = await status();
  return callFactsThroughTransport(connection, {
    action: 'submit',
    path: project.root,
    file: project.submission(name, JSON.stringify(records)),
    resolutionEpoch: (current.summary as unknown as FactsStatusSummary)
      .resolutionEpoch,
  });
}

/** Every file the current status still counts as unsettled, by list. */
async function openWork(): Promise<Record<string, unknown>> {
  const current = await status();
  const data = current.data as unknown as FactsStatusData;
  return {
    missing: data.missing.paths,
    needsResolution: data.needsResolution.paths,
    rejected: data.rejected.items.map(({ path, code }) => `${path}:${code}`),
    unadjudicated: data.unadjudicated.items.map(({ path }) => path),
    pendingAttestations: data.pendingAttestations.map(({ path }) => path),
    indeterminate: data.indeterminate.paths,
    exact: (current.summary as unknown as FactsStatusSummary).exact,
  };
}

describe('a reference the file does not contain cannot enter the graph', () => {
  it('drops a fabricated specifier, names it, and settles the file on a second honest submission', async () => {
    const fabricated = await submit('fabricated.json', [
      project.facts('src/index.ts', {
        references: [
          {
            kind: 're-export',
            specifier: './ghost.js',
            resolved: { path: 'src/thing.ts' },
          },
        ],
      }),
      project.facts('src/thing.ts'),
    ]);
    expect(
      (fabricated.summary as unknown as FactsSubmitSummary).rejectedClaims,
    ).toBe(1);
    const afterFabrication = await openWork();
    expect(afterFabrication.rejected).toEqual([
      'src/index.ts:facts-reference-absent',
    ]);

    const honest = await submit('honest.json', [
      project.facts('src/index.ts', {
        references: [
          {
            kind: 're-export',
            specifier: './thing.js',
            resolved: { path: 'src/thing.ts' },
          },
        ],
      }),
    ]);
    expect(
      (honest.summary as unknown as FactsSubmitSummary).rejectedClaims,
    ).toBe(0);
    expect(await openWork()).toMatchObject({
      missing: [],
      rejected: [],
      unadjudicated: [],
      pendingAttestations: [],
      indeterminate: [],
      exact: 2,
    });
  });

  it('reports the same refusal without opening new work when the same batch is sent again', async () => {
    const batch = [
      project.facts('src/index.ts', {
        references: [
          {
            kind: 're-export',
            specifier: './ghost.js',
            resolved: { path: 'src/thing.ts' },
          },
        ],
      }),
    ];
    await submit('first.json', batch);
    const before = await openWork();
    await submit('second.json', batch);
    expect(await openWork()).toEqual(before);
  });
});
