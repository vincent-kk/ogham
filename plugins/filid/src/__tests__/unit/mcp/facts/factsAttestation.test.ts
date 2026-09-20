import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FACTS_ADJUDICATION_ORIGINS,
  FACTS_ADJUDICATION_STATES,
  FACTS_ATTESTATION_OUTCOMES,
  FACTS_REJECTION_CODES,
} from '../../../../constants/facts.js';
import {
  readAdjudicationTable,
  readFactsStore,
  readPendingStore,
  resolveFactsStorePaths,
} from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsDiscardPendingSummary,
  FactsStatusData,
  FactsStatusSummary,
  FactsSubmitData,
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

const REFERENCE = './thing.js';

/** Line 1 is the reference; line 2 matches no pattern, so it owes nothing. */
const BODY = `export { thing } from '${REFERENCE}';\nexport const value = 1;\n`;

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-attest-'));
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

/** What one submission asserts about `src/index.ts`. */
interface Claim {
  /** In-project target of the reference, or null to claim no reference. */
  target?: string | null;
  /** Lines the record says are not references. */
  nonReferences?: { line: number; reason: string }[];
  /** Provenance tier; attested unless a tool record is being tested. */
  tier?: 'tool' | 'attested';
  /** A content hash to send instead of the file's current one. */
  contentHash?: string;
}

/**
 * Submit one record for `src/index.ts` under one actor.
 * @param actor Who is claiming.
 * @param claim What the record says.
 * @returns The submit summary and its evidence.
 */
async function submit(
  actor: string,
  claim: Claim = {},
): Promise<{ summary: FactsSubmitSummary; data: FactsSubmitData }> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const target = claim.target === undefined ? 'src/thing.ts' : claim.target;
  const facts = project.facts('src/index.ts', {
    references:
      target === null
        ? []
        : [{ specifier: REFERENCE, kind: 'static', resolved: { path: target } }],
    ...(claim.nonReferences === undefined
      ? {}
      : { nonReferences: claim.nonReferences }),
    ...(claim.contentHash === undefined
      ? {}
      : { contentHash: claim.contentHash }),
    provenance: {
      tool: 'reader',
      version: '1.0.0',
      command: 'read',
      tier: claim.tier ?? 'attested',
      resolutionInputs: [],
    },
  });
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file: project.submission(
      `attest-${Math.random().toString(36).slice(2)}.json`,
      JSON.stringify([facts]),
    ),
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
    actor,
  });
  return {
    summary: result.summary as FactsSubmitSummary,
    data: result.data as FactsSubmitData,
  };
}

/** The pending attestation held for `src/index.ts`, if any. */
function pendingActor(): string | undefined {
  const paths = resolveFactsStorePaths(project.root);
  return readPendingStore(paths.pendingDirectory).pages.get(
    paths.pathDigest('src/index.ts'),
  )?.actor;
}

/** Whether the store holds a record for `src/index.ts`. */
function hasRecord(): boolean {
  const paths = resolveFactsStorePaths(project.root);
  return [...readFactsStore(paths.directory).records.values()].some(
    (record) => record.facts.path === 'src/index.ts',
  );
}

describe('attested submissions and the second reader that confirms them', () => {
  it('A1: refuses an unexplained line by number, storing nothing', async () => {
    const { data } = await submit('reader-a', { target: null });

    expect(data.rejected[0]).toMatchObject({
      code: FACTS_REJECTION_CODES.ATTESTED_UNACCOUNTED,
      lines: [1],
    });
    expect(pendingActor()).toBeUndefined();
  });

  it('A1: accepts the same file once nonReferences explains that line', async () => {
    const { summary, data } = await submit('reader-a', {
      target: null,
      nonReferences: [{ line: 1, reason: 'the specifier is in a doc comment' }],
    });

    expect(data.rejected).toEqual([]);
    expect(summary.attestationsPending).toBe(1);
  });

  it('A2: holds the first submission and leaves the file uncertain', async () => {
    const { summary, data } = await submit('reader-a');
    const status = await handleFacts({ action: 'status', path: project.root });

    expect(summary.attestationsPending).toBe(1);
    expect(hasRecord()).toBe(false);
    expect(data.attested[0]).toMatchObject({
      outcome: FACTS_ATTESTATION_OUTCOMES.PENDING,
    });
    expect((status.summary as FactsStatusSummary).uncertain).toBe(1);
    expect((status.data as FactsStatusData).pendingAttestations).toMatchObject([
      { path: 'src/index.ts', actor: 'reader-a' },
    ]);
  });

  it('A3: refuses a record that fails an ordinary check, attested or not', async () => {
    const { data } = await submit('reader-a', {
      contentHash: `sha256:${'1'.repeat(64)}`,
    });

    expect(data.rejected[0]?.code).toBe(FACTS_REJECTION_CODES.HASH_MISMATCH);
    expect(pendingActor()).toBeUndefined();
  });

  it('A4: stores the record when a different actor agrees', async () => {
    await submit('reader-a');

    const { summary } = await submit('reader-b');
    const status = await handleFacts({ action: 'status', path: project.root });

    expect(summary.attestationsConfirmed).toBe(1);
    expect(hasRecord()).toBe(true);
    expect(pendingActor()).toBeUndefined();
    expect((status.summary as FactsStatusSummary).exact).toBe(1);
  });

  it('A5: stores nothing and keeps the pending one when they disagree', async () => {
    await submit('reader-a');

    const { summary, data } = await submit('reader-b', {
      target: 'src/other.ts',
    });

    expect(summary.attestationsConfirmed).toBe(0);
    expect(hasRecord()).toBe(false);
    // Replacing it would let the two overwrite each other forever.
    expect(pendingActor()).toBe('reader-a');
    expect(data.attested[0]).toMatchObject({
      outcome: FACTS_ATTESTATION_OUTCOMES.MISMATCH,
      differences: [{ side: 'pending', lines: [1] }, { side: 'submitted' }],
    });
  });

  it('A6: treats a resubmission by the same actor as no confirmation', async () => {
    await submit('reader-a');

    const { summary, data } = await submit('READER-A ');

    expect(summary.attestationsConfirmed).toBe(0);
    expect(hasRecord()).toBe(false);
    expect(data.attested[0]).toMatchObject({
      outcome: FACTS_ATTESTATION_OUTCOMES.SAME_ACTOR,
    });
  });

  it('A7: shows the same actor what it now says differently', async () => {
    await submit('reader-a');

    const { data } = await submit('reader-a', { target: 'src/other.ts' });

    expect(data.attested[0]).toMatchObject({
      outcome: FACTS_ATTESTATION_OUTCOMES.SAME_ACTOR,
    });
    expect(data.attested[0]?.differences).toHaveLength(2);
    expect(pendingActor()).toBe('reader-a');
  });

  it('A8: discard-pending clears the attestation and nothing else', async () => {
    await submit('reader-a', { tier: 'tool' });
    await submit('reader-b');
    expect(pendingActor()).toBe('reader-b');

    const result = await handleFacts({
      action: 'discard-pending',
      path: project.root,
      sourcePaths: ['src/index.ts'],
    });

    expect((result.summary as FactsDiscardPendingSummary).discarded).toBe(1);
    expect(pendingActor()).toBeUndefined();
    expect(hasRecord()).toBe(true);
  });

  it('A9: drops a pending attestation made against other bytes', async () => {
    await submit('reader-a');
    project.write('src/index.ts', `// a new first line\n${BODY}`);

    const { data } = await submit('reader-b', {
      nonReferences: [{ line: 1, reason: 'a comment repeating the import' }],
    });

    expect(data.attested[0]).toMatchObject({
      outcome: FACTS_ATTESTATION_OUTCOMES.REPLACED,
    });
    expect(pendingActor()).toBe('reader-b');
    expect(hasRecord()).toBe(false);
  });

  it('A10: a tool record for the file discards its pending attestation', async () => {
    await submit('reader-a');

    await submit('a-tool', { tier: 'tool' });

    expect(hasRecord()).toBe(true);
    expect(pendingActor()).toBeUndefined();
  });

  it('A11: reports a path that held no attestation rather than refusing', async () => {
    const result = await handleFacts({
      action: 'discard-pending',
      path: project.root,
      sourcePaths: ['src/index.ts'],
    });

    expect(result.status).toBe('ok');
    expect((result.summary as FactsDiscardPendingSummary)).toMatchObject({
      discarded: 0,
      absent: 1,
    });
  });

  it('refuses an attested record when the call names no actor', async () => {
    const status = await handleFacts({ action: 'status', path: project.root });
    const result = await handleFacts({
      action: 'submit',
      path: project.root,
      file: project.submission(
        'no-actor.json',
        JSON.stringify([
          project.facts('src/index.ts', {
            references: [
              { specifier: REFERENCE, kind: 'static', resolved: { path: 'src/thing.ts' } },
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

    expect((result.data as FactsSubmitData).rejected[0]?.code).toBe(
      FACTS_REJECTION_CODES.ATTESTED_ACTOR_REQUIRED,
    );
  });

  it('leaves a file with a pending attestation out of the extraction list', async () => {
    await submit('reader-a');
    const status = await handleFacts({ action: 'status', path: project.root });

    // It is not waiting for an extraction; it is waiting for a second reader.
    expect((status.data as FactsStatusData).missing.paths).not.toContain(
      'src/index.ts',
    );
    expect((status.data as FactsStatusData).uncertain.paths).toContain(
      'src/index.ts',
    );
  });
});

/** The one side-table item held for `src/index.ts`, if any. */
function sideTableItem(): Record<string, unknown> | undefined {
  const paths = resolveFactsStorePaths(project.root);
  return readAdjudicationTable(paths.sideTableDirectory).pages.get(
    paths.pathDigest('src/index.ts'),
  )?.items[0] as Record<string, unknown> | undefined;
}

describe('a confirmed attestation meeting the tool edge it drops', () => {
  it('A13: records an agreed non-reference as dismissed, not as new work', async () => {
    // The tool read a commented-out import as a reference. Two readers say the
    // line is a comment — the same two pairs of eyes a dismissal takes — so
    // demanding two more would be the ceremony twice.
    project.write(
      'src/index.ts',
      `// export { thing } from '${REFERENCE}';\nexport const value = 1;\n`,
    );
    await submit('a-tool', { tier: 'tool' });
    const attested: Claim = {
      target: null,
      nonReferences: [{ line: 1, reason: 'the specifier is inside a comment' }],
    };
    await submit('reader-a', attested);

    const { summary } = await submit('reader-b', attested);
    const status = await handleFacts({ action: 'status', path: project.root });

    expect(summary).toMatchObject({
      attestationsConfirmed: 1,
      attestationDismissals: 1,
      openedItems: 0,
    });
    expect((status.summary as FactsStatusSummary).uncertain).toBe(0);
    expect(sideTableItem()).toMatchObject({
      state: FACTS_ADJUDICATION_STATES.DISMISSED,
      origin: FACTS_ADJUDICATION_ORIGINS.ATTESTED_NON_REFERENCE,
      actor: 'reader-a',
      reason: 'the specifier is inside a comment',
    });
  });

  it('A14: still opens an item for an edge no one explained away', async () => {
    // Here the readers agree the line IS a reference and only disagree with the
    // tool about where it goes. Nobody read that line as a non-reference, so
    // the dropped edge is ordinary walked-back coverage.
    await submit('a-tool', { tier: 'tool' });
    const attested: Claim = { target: 'src/other.ts' };
    await submit('reader-a', attested);

    const { summary } = await submit('reader-b', attested);

    expect(summary).toMatchObject({
      attestationsConfirmed: 1,
      attestationDismissals: 0,
      openedItems: 1,
    });
    expect(sideTableItem()).toMatchObject({
      state: FACTS_ADJUDICATION_STATES.UNADJUDICATED,
    });
  });
});
