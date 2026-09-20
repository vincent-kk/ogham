import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FACTS_ATTESTATION_OUTCOMES } from '../../../constants/facts.js';
import { createServer } from '../../../mcp/server/lifecycle/createServer.js';
import type {
  FactsStatusData,
  FactsStatusSummary,
  FactsSubmitData,
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

/** The one file every case attests or judges. */
const SUBJECT = 'src/index.ts';

/** Value of `CLAUDE_CONFIG_DIR` before a case redirected the store. */
const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

let stateRoot: string;
let project: FactsProject;
let connection: Awaited<ReturnType<typeof connectTestClient>>;

beforeEach(async () => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-actor-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    [SUBJECT]: "export { thing } from './thing.js';\n",
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

/** The reference every attested record in this file reports. */
const REFERENCE = {
  kind: 're-export' as const,
  specifier: './thing.js',
  resolved: { path: 'src/thing.ts' },
};

/**
 * Submit one attested record for the subject under one actor identity.
 * @param name Submission file name, unique within one case.
 * @param actor The identity the submitter declares.
 * @returns The submit envelope.
 */
async function attest(name: string, actor: string): Promise<FactsEnvelope> {
  const current = await status();
  return callFactsThroughTransport(connection, {
    action: 'submit',
    path: project.root,
    actor,
    file: project.submission(
      name,
      JSON.stringify([
        project.facts(SUBJECT, {
          references: [REFERENCE],
          provenance: {
            tool: 'reader',
            version: '1.0.0',
            command: 'read',
            tier: 'attested',
            resolutionInputs: [],
          },
        }),
      ]),
    ),
    resolutionEpoch: (current.summary as unknown as FactsStatusSummary)
      .resolutionEpoch,
  });
}

describe('an attestation is confirmed by another actor, not by another spelling', () => {
  it.each([
    ['the same name in capitals', 'Reader-A'],
    ['the same name with spaces around it', '  reader-a  '],
  ])(
    'refuses to confirm its own attestation through %s',
    async (_label, variant) => {
      expect(
        (
          (await attest('first.json', 'reader-a'))
            .data as unknown as FactsSubmitData
        ).attested?.[0]?.outcome,
      ).toBe(FACTS_ATTESTATION_OUTCOMES.PENDING);

      const retry = await attest('variant.json', variant);
      expect(
        (retry.data as unknown as FactsSubmitData).attested?.[0]?.outcome,
      ).toBe(FACTS_ATTESTATION_OUTCOMES.SAME_ACTOR);
      const pending = ((await status()).data as unknown as FactsStatusData)
        .pendingAttestations;
      expect(pending.map(({ path, actor }) => [path, actor])).toEqual([
        [SUBJECT, 'reader-a'],
      ]);
    },
  );

  it('settles the file once a genuinely different actor reads it', async () => {
    await attest('first.json', 'reader-a');
    const confirmation = await attest('second.json', 'reader-b');
    expect(
      (confirmation.data as unknown as FactsSubmitData).attested?.[0]?.outcome,
    ).toBe(FACTS_ATTESTATION_OUTCOMES.CONFIRMED);
    const settled = await status();
    expect(
      (settled.data as unknown as FactsStatusData).pendingAttestations,
    ).toEqual([]);
    expect(
      (settled.summary as unknown as FactsStatusSummary).pendingAttestations,
    ).toBe(0);
  });
});
