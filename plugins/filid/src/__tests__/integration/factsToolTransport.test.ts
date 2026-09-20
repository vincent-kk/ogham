import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FACTS_ADJUDICATION_STATES,
  FACTS_ATTESTATION_OUTCOMES,
} from '../../constants/facts.js';
import { McpToolName } from '../../constants/mcpToolNames.js';
import { createServer } from '../../mcp/server/lifecycle/createServer.js';
import type {
  FactsAdjudicateSummary,
  FactsCompareData,
  FactsDiscardPendingSummary,
  FactsOpenItem,
  FactsStatusData,
  FactsStatusSummary,
  FactsSubmitData,
  FactsSubmitSummary,
} from '../../mcp/tools/facts/index.js';
import {
  cleanupFactsProjects,
  createFactsProject,
} from '../unit/mcp/facts/helpers/createFactsProject.js';
import type { FactsProject } from '../unit/mcp/facts/helpers/createFactsProject.js';

import { connectTestClient } from './helpers/connectTestClient.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

const CONFIG = JSON.stringify({
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
  facts: { covers: ['src/**'] },
});

/** The edge the candidate reports and the store does not hold. */
const REFERENCE = './thing.js';

let stateRoot: string;
let project: FactsProject;
let connection: Awaited<ReturnType<typeof connectTestClient>>;

beforeEach(async () => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-transport-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': `export { thing } from '${REFERENCE}';\n`,
    'src/thing.ts': 'export const thing = 1;\n',
    'src/other.ts': 'export const other = 1;\n',
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

/** One tool envelope as the transport delivers it. */
interface Envelope {
  status: string;
  summary: unknown;
  data: unknown;
}

/**
 * Call the facts tool through the MCP transport and parse its envelope.
 *
 * Going through `callTool` is the whole point: the SDK parses arguments with
 * the ADVERTISED schema before the handler sees them, so an argument the
 * internal union accepts but the advertised object omits is stripped here and
 * nowhere else. A test that calls `handleFacts` directly cannot see it.
 *
 * @param args - Arguments exactly as a model would send them.
 * @returns The parsed envelope.
 */
async function callFacts(args: Record<string, unknown>): Promise<Envelope> {
  const result = await connection.client.callTool({
    name: McpToolName.FACTS,
    arguments: args,
  });
  const content: unknown = Array.isArray(result.content)
    ? result.content[0]
    : null;
  if (
    !content ||
    typeof content !== 'object' ||
    !('text' in content) ||
    typeof content.text !== 'string'
  )
    throw new Error('expected a text envelope');
  return JSON.parse(content.text) as Envelope;
}

/**
 * Submit one record for `src/index.ts` that claims no reference.
 * @returns Nothing; the store holds that record afterwards.
 */
async function submitEmptyRecord(): Promise<void> {
  const status = await callFacts({ action: 'status', path: project.root });
  await callFacts({
    action: 'submit',
    path: project.root,
    file: project.submission(
      'batch.json',
      JSON.stringify([project.facts('src/index.ts', { references: [] })]),
    ),
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * Submit one attested record for `src/index.ts` under one actor.
 * @param actor Who is claiming.
 * @param target In-project path the reference resolves to.
 * @returns The envelope, as the transport delivers it.
 */
async function attest(actor: string, target: string): Promise<Envelope> {
  const status = await callFacts({ action: 'status', path: project.root });
  return await callFacts({
    action: 'submit',
    path: project.root,
    actor,
    file: project.submission(
      `attest-${Math.random().toString(36).slice(2)}.json`,
      JSON.stringify([
        project.facts('src/index.ts', {
          references: [
            { specifier: REFERENCE, kind: 'static', resolved: { path: target } },
          ],
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
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

describe('the facts tool across the MCP transport', () => {
  it('carries every compare and adjudicate argument through to the handler', async () => {
    await submitEmptyRecord();

    const compared = await callFacts({
      action: 'compare',
      path: project.root,
      file: project.submission(
        'candidate.json',
        JSON.stringify([
          project.facts('src/index.ts', {
            references: [
              {
                specifier: REFERENCE,
                kind: 'static',
                resolved: { path: 'src/thing.ts' },
              },
            ],
          }),
        ]),
      ),
    });
    const item = (compared.data as FactsCompareData)
      .sideTableItems[0] as FactsOpenItem;

    // Every value below came out of the compare response and has to survive the
    // trip back, including the fields nested inside items[].
    const judged = await callFacts({
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
          decision: 'dismiss',
          reason: 'the specifier is inside a comment',
        },
      ],
    });

    expect(item.resolvedPath).toBe('src/thing.ts');
    expect((judged.summary as FactsAdjudicateSummary).applied).toBe(1);
    expect(judged.data).toMatchObject({
      outcomes: [{ state: FACTS_ADJUDICATION_STATES.PENDING_DISMISS }],
      refused: [],
    });
  });

  it('carries an attested submission from first reader to confirmation', async () => {
    const first = await attest('reader-a', 'src/thing.ts');
    const waiting = await callFacts({ action: 'status', path: project.root });

    const second = await attest('reader-b', 'src/thing.ts');
    const settled = await callFacts({ action: 'status', path: project.root });

    expect((first.summary as FactsSubmitSummary).attestationsPending).toBe(1);
    // status alone has to say what is owed and who may not supply it.
    expect((waiting.summary as FactsStatusSummary).attestationRequirement).toContain(
      'DIFFERENT actor',
    );
    expect(
      (waiting.data as FactsStatusData).pendingAttestations[0],
    ).toMatchObject({ path: 'src/index.ts', actor: 'reader-a' });
    expect((second.summary as FactsSubmitSummary).attestationsConfirmed).toBe(1);
    expect((settled.summary as FactsStatusSummary).pendingAttestations).toBe(0);
  });

  it('carries discard-pending, including the paths that held nothing', async () => {
    await attest('reader-a', 'src/thing.ts');
    const refused = await attest('reader-b', 'src/other.ts');

    const discarded = await callFacts({
      action: 'discard-pending',
      path: project.root,
      sourcePaths: ['src/index.ts', 'src/thing.ts'],
    });
    const after = await callFacts({ action: 'status', path: project.root });

    expect((refused.data as FactsSubmitData).attested[0]).toMatchObject({
      outcome: FACTS_ATTESTATION_OUTCOMES.MISMATCH,
    });
    expect(discarded.summary as FactsDiscardPendingSummary).toMatchObject({
      discarded: 1,
      absent: 1,
    });
    expect((after.summary as FactsStatusSummary).pendingAttestations).toBe(0);
  });

  it('advertises every one of those arguments, nested fields included', async () => {
    const { tools } = await connection.client.listTools();
    const facts = tools.find((tool) => tool.name === McpToolName.FACTS);
    const schema = facts?.inputSchema as {
      properties?: Record<string, unknown>;
    };
    const items = schema.properties?.items as {
      items?: { properties?: Record<string, unknown> };
    };

    // The advertised schema is what the model reads AND what the SDK strips
    // against, so an argument missing here is invisible twice over.
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual([
      'action',
      'actor',
      'contentHash',
      'file',
      'generationId',
      'items',
      'path',
      'resolutionEpoch',
      'sourcePath',
      'sourcePaths',
    ]);
    expect(Object.keys(items.items?.properties ?? {}).sort()).toEqual([
      'decision',
      'kind',
      'reason',
      'reference',
      'resolvedPath',
    ]);
  });
});
