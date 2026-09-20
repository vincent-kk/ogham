import { createHash } from 'node:crypto';
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FACTS_FILE_STATES } from '../../../../constants/facts.js';
import {
  classifyProjectFacts,
  readPendingStore,
  readProjectFacts,
  resolveFactsStorePaths,
} from '../../../../core/facts/index.js';
import { createDefaultConfig } from '../../../../core/infra/configLoader/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsStatusData,
  FactsStatusSummary,
} from '../../../../mcp/tools/facts/index.js';

import {
  cleanupFactsProjects,
  createFactsProject,
} from './helpers/createFactsProject.js';
import type { FactsProject } from './helpers/createFactsProject.js';

const CONFIG = JSON.stringify({
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
  facts: { covers: ['src/**'] },
});

/** The edge the fixture argues about. */
const EDGE = {
  specifier: './thing.js',
  kind: 'static' as const,
  resolved: { path: 'src/thing.ts' },
};

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

/** Windows maps mode 0o000 to the read-only attribute, which still reads — the damage cannot be staged. */
const unreadableFilesUnsupported = process.platform === 'win32';

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-damaged-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': "export { thing } from './thing.js';\n",
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

/**
 * Store a record for `src/index.ts` carrying exactly these references.
 * @param name Submission file name.
 * @param references What the record claims.
 */
async function submit(
  name: string,
  references: (typeof EDGE)[],
): Promise<void> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const file = project.submission(
    name,
    JSON.stringify([project.facts('src/index.ts', { references })]),
  );
  await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * The state model's answer for one file, read the way analysis reads it.
 * @param path Project-relative path.
 * @returns That file's facts state.
 */
async function stateOf(path: string): Promise<string | undefined> {
  const facts = await readProjectFacts(project.root, {
    ...createDefaultConfig(),
    facts: { covers: ['src/**'] },
  });
  return classifyProjectFacts(project.root, facts).get(path);
}

/**
 * Every open side-table item the project holds.
 * @returns Items as `facts status` reports them.
 */
async function openItems() {
  const result = await handleFacts({ action: 'status', path: project.root });
  return (result.data as FactsStatusData).unadjudicated.items;
}

/**
 * Digest of a file's current bytes.
 * @param path Absolute path to read.
 * @returns Hex sha256 of what is there now.
 */
function digestOf(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** The side-table directory of the fixture project. */
function sideTableDirectory(): string {
  return resolveFactsStorePaths(project.root).sideTableDirectory;
}

/**
 * Open one item, then damage the shard that holds it.
 * @param damage How to break the shard on disk.
 * @returns The shard file name that was damaged.
 */
async function openItemThenDamage(
  damage: 'unparseable' | 'unreadable',
): Promise<string> {
  await submit('with-edge.json', [EDGE]);
  await submit('without-edge.json', []);
  const directory = sideTableDirectory();
  const [shard] = readdirSync(directory).filter((name) =>
    name.endsWith('.json'),
  );
  const path = join(directory, shard!);
  if (damage === 'unparseable') writeFileSync(path, '{ not json');
  else chmodSync(path, 0o000);
  return shard!;
}

describe('a judgement shard the store cannot read is not an empty one', () => {
  it.for([['unparseable'], ['unreadable']] as const)(
    'reports the file uncertain when its side-table shard is %s',
    async ([damage], { skip }) => {
      if (
        damage === 'unreadable' &&
        (unreadableFilesUnsupported || process.getuid?.() === 0)
      )
        skip(
          'the damage cannot be staged: Windows keeps a 0o000 file readable, and root reads every file',
        );
      await openItemThenDamage(damage);

      // Without the item the record alone reads as agreement, and analysis
      // would conclude from a disagreement nobody judged.
      expect(await stateOf('src/index.ts')).toBe(FACTS_FILE_STATES.UNCERTAIN);
    },
  );

  it('names the damaged shard and what to do about it', async () => {
    const shard = await openItemThenDamage('unparseable');

    const status = await handleFacts({ action: 'status', path: project.root });

    const diagnostic = status.diagnostics.find(
      ({ code }) => code === 'facts-judgements-unreadable',
    );
    expect(diagnostic?.message).toContain(shard);
    expect(diagnostic?.nextAction).toContain('discard-damaged');
    expect((status.data as FactsStatusData).uncertain.paths).toContain(
      'src/index.ts',
    );
  });

  it('keeps the edge when a dismissal is lost and hides none when an adoption is', async () => {
    await openItemThenDamage('unparseable');

    // Both judgements live in the shard that did not read. A lost dismissal
    // leaves the edge in place, which is the safe direction; a lost adoption
    // would remove one. The file is uncertain either way, so neither reaches
    // a conclusion — which is the point of the asymmetry.
    const facts = await readProjectFacts(project.root, {
      ...createDefaultConfig(),
      facts: { covers: ['src/**'] },
    });

    expect(facts.adjudications.get('src/index.ts')).toBeUndefined();
    expect(classifyProjectFacts(project.root, facts).get('src/index.ts')).toBe(
      FACTS_FILE_STATES.UNCERTAIN,
    );
  });
});

describe('a record shard the store cannot read falls to missing, and a submission repairs it', () => {
  it('reads as missing and returns to exact after resubmitting', async () => {
    await submit('first.json', [EDGE]);
    const directory = resolveFactsStorePaths(project.root).directory;
    const [shard] = readdirSync(directory).filter((name) =>
      name.endsWith('.json'),
    );
    writeFileSync(join(directory, shard!), '{ not json');

    expect(await stateOf('src/index.ts')).toBe(FACTS_FILE_STATES.MISSING);

    await submit('repair.json', [EDGE]);

    expect(await stateOf('src/index.ts')).toBe(FACTS_FILE_STATES.EXACT);
  });
});

describe('a write never replaces a shard nobody could compare against', () => {
  it('loses the compare-and-set instead of overwriting unreadable bytes', async ({
    skip,
  }) => {
    if (unreadableFilesUnsupported || process.getuid?.() === 0)
      skip(
        'the damage cannot be staged: Windows keeps a 0o000 file readable, and root reads every file',
      );
    await submit('first.json', [EDGE]);
    const directory = resolveFactsStorePaths(project.root).directory;
    const [shard] = readdirSync(directory).filter((name) =>
      name.endsWith('.json'),
    );
    const path = join(directory, shard!);
    const before = digestOf(path);
    chmodSync(path, 0o000);

    await submit('second.json', []);

    chmodSync(path, 0o600);
    // A read failure is not "no file there": treating the two alike made the
    // write replace bytes no compare-and-set had compared.
    expect(digestOf(path)).toBe(before);
  });
});

describe('a shard covering another file is never overwritten by an ordinary submit', () => {
  it('refuses the second file, keeps the first uncertain, and stores no record for either', async () => {
    // `src/index.ts` and `src/f902.ts` hash to the same shard prefix, `a2`.
    project.write('src/f902.ts', "export { thing } from './thing.js';\n");

    async function submitPair(claims: {
      index: boolean;
      f902: boolean;
    }): Promise<void> {
      const status = await handleFacts({ action: 'status', path: project.root });
      const file = project.submission(
        `pair-${claims.index}-${claims.f902}.json`,
        JSON.stringify([
          project.facts('src/index.ts', {
            references: claims.index ? [EDGE] : [],
          }),
          project.facts('src/f902.ts', {
            references: claims.f902 ? [EDGE] : [],
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

    // Baseline: both files claim the edge, so there is nothing to judge yet.
    await submitPair({ index: true, f902: true });
    // Walk the edge back for `index.ts` alone: opens an item on a healthy shard.
    await submitPair({ index: false, f902: true });

    const shardPath = join(sideTableDirectory(), 'a2.json');
    writeFileSync(shardPath, '{ not json');
    const before = digestOf(shardPath);

    // An ordinary submit walks the edge back for `f902.ts` too, on the shard
    // that is now damaged.
    const status = await handleFacts({ action: 'status', path: project.root });
    const result = await handleFacts({
      action: 'submit',
      path: project.root,
      file: project.submission(
        'f902-drop.json',
        JSON.stringify([project.facts('src/f902.ts', { references: [] })]),
      ),
      resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
    });

    expect(result.status).toBe('indeterminate');
    // The damaged shard was refused wholesale, not silently replaced with only
    // the page this submit knew about.
    expect(digestOf(shardPath)).toBe(before);
    expect(await stateOf('src/index.ts')).toBe(FACTS_FILE_STATES.UNCERTAIN);
    const statusAfter = await handleFacts({ action: 'status', path: project.root });
    expect(
      statusAfter.diagnostics.some(
        ({ code }) => code === 'facts-judgements-unreadable',
      ),
    ).toBe(true);
    const conflictDiagnostic = result.diagnostics.find(
      ({ code }) => code === 'facts-judgements-unreadable',
    );
    expect(conflictDiagnostic?.message).toContain('src/f902.ts');

    // The record dropping the edge lost its opening page, so it was never
    // stored — the record still on disk is the one that claims it.
    const facts = await readProjectFacts(project.root, {
      ...createDefaultConfig(),
      facts: { covers: ['src/**'] },
    });
    expect(
      facts.records
        .get('src/f902.ts')
        ?.record.facts.references.map((reference) => reference.specifier),
    ).toEqual(['./thing.js']);
    expect(await stateOf('src/f902.ts')).not.toBe(FACTS_FILE_STATES.EXACT);

    const discardResult = await handleFacts({
      action: 'discard-damaged',
      path: project.root,
      shards: ['a2.json'],
    });
    expect(discardResult.summary).toMatchObject({ discarded: 1 });
    expect(
      (
        (await handleFacts({ action: 'status', path: project.root }))
          .data as FactsStatusData
      ).awaitingComparison.items.map((item) => item.path),
    ).toContain('src/index.ts');
  });
});

describe('discarding a damaged judgement shard is the way out', () => {
  it('drops it, frees the files it covered, and says how to find what was lost', async () => {
    const shard = await openItemThenDamage('unparseable');
    expect(await stateOf('src/index.ts')).toBe(FACTS_FILE_STATES.UNCERTAIN);

    const result = await handleFacts({
      action: 'discard-damaged',
      path: project.root,
      shards: [shard],
    });

    expect(result.status).toBe('ok');
    expect(result.summary).toMatchObject({ discarded: 1, refused: 0 });
    // The damage block is over — nothing else can write a shard nobody can
    // read — but the discard took what the shard held, so the file is held by
    // the discard instead of by the damage until somebody re-derives it.
    expect(await stateOf('src/index.ts')).toBe(FACTS_FILE_STATES.UNCERTAIN);
    const status = await handleFacts({ action: 'status', path: project.root });
    expect(
      status.diagnostics.map(({ code }) => code),
    ).not.toContain('facts-judgements-unreadable');
    expect(
      (status.data as FactsStatusData).awaitingComparison.items.map(
        (item) => item.path,
      ),
    ).toContain('src/index.ts');
    expect(result.diagnostics[0]?.nextAction).toContain('compare');
  });

  it('says what a discarded pending shard cost, which is no edge at all', async () => {
    const bytes = readFileSync(join(project.root, 'src/index.ts'));
    const first = await handleFacts({ action: 'status', path: project.root });
    await handleFacts({
      action: 'submit',
      path: project.root,
      file: project.submission(
        'attested.json',
        JSON.stringify([
          {
            schemaVersion: 1,
            path: 'src/index.ts',
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
      resolutionEpoch: (first.summary as FactsStatusSummary).resolutionEpoch,
      actor: 'first-reader',
    });
    const pendingDirectory = resolveFactsStorePaths(project.root)
      .pendingDirectory;
    const [shard] = readdirSync(pendingDirectory).filter((name) =>
      name.endsWith('.json'),
    );
    writeFileSync(join(pendingDirectory, shard as string), '{ not json');

    const result = await handleFacts({
      action: 'discard-damaged',
      path: project.root,
      shards: [shard as string],
    });

    // An unconfirmed attestation was never agreed, so nothing is held by this
    // discard. Sending the caller to awaitingComparison would name a list the
    // response leaves empty.
    expect(result.summary).toMatchObject({ discarded: 1, affectedFiles: 0 });
    expect(
      (
        (await handleFacts({ action: 'status', path: project.root }))
          .data as FactsStatusData
      ).awaitingComparison.items,
    ).toEqual([]);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.nextAction).not.toContain('awaitingComparison');
    expect(diagnostic?.message).not.toContain('stay uncertain');
  });

  it('refuses a shard the store reads, so it cannot delete live judgements', async () => {
    await submit('with-edge.json', [EDGE]);
    await submit('without-edge.json', []);
    const [shard] = readdirSync(sideTableDirectory()).filter((name) =>
      name.endsWith('.json'),
    );

    const result = await handleFacts({
      action: 'discard-damaged',
      path: project.root,
      shards: [shard!],
    });

    expect(result.status).toBe('indeterminate');
    expect(result.summary).toMatchObject({ discarded: 0, refused: 1 });
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      'facts-shard-not-damaged',
    );
    expect((await openItems()).length).toBeGreaterThan(0);
  });
});

describe('a tool that fails once cannot forget what the file referenced', () => {
  /**
   * Replace the record with one saying the tool could not read the file.
   * @param name Submission file name.
   */
  async function submitToolError(name: string): Promise<void> {
    const status = await handleFacts({ action: 'status', path: project.root });
    const file = project.submission(
      name,
      JSON.stringify([
        project.facts('src/index.ts', {
          references: [],
          toolError: { message: 'could not read' },
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

  it('opens an item for an edge dropped across a tool-error record', async () => {
    await submit('with-edge.json', [EDGE]);
    await submitToolError('broken.json');

    // The record in the store now claims nothing, so a replacement that also
    // claims nothing has an empty list to be compared against — and the edge
    // would leave with no item and no second actor.
    await submit('empty.json', []);

    expect(await openItems()).toMatchObject([
      { path: 'src/index.ts', resolvedPath: 'src/thing.ts' },
    ]);
    expect(await stateOf('src/index.ts')).toBe(FACTS_FILE_STATES.UNCERTAIN);
  });

  it('keeps the baseline across a run of tool-error records', async () => {
    await submit('with-edge.json', [EDGE]);
    await submitToolError('broken-1.json');
    await submitToolError('broken-2.json');
    await submitToolError('broken-3.json');

    await submit('empty.json', []);

    expect(await openItems()).toMatchObject([
      { path: 'src/index.ts', resolvedPath: 'src/thing.ts' },
    ]);
  });
});

describe('a re-resolution excuses an edge that moved, not one that left', () => {
  it('opens an item when the new record resolves the string nowhere', async () => {
    await submit('with-edge.json', [EDGE]);
    // A new epoch from the same tool: the exemption's own condition.
    project.write('src/added.ts', 'export const added = 1;\n');
    const status = await handleFacts({ action: 'status', path: project.root });
    const file = project.submission(
      'unresolved.json',
      JSON.stringify([
        project.facts('src/index.ts', {
          references: [
            { specifier: './thing.js', kind: 'static', resolved: { unresolved: true } },
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

    // `src/thing.ts` is still a scanned file, so nothing moved — the edge was
    // dropped, and a re-resolution cannot explain that.
    expect(await openItems()).toMatchObject([
      { path: 'src/index.ts', resolvedPath: 'src/thing.ts' },
    ]);
  });
});

describe('a pending attestation does not outlive its file', () => {
  it('is cleared when the file leaves the tree', async () => {
    const bytes = readFileSync(join(project.root, 'src/index.ts'));
    const attested = project.submission(
      'attested.json',
      JSON.stringify([
        {
          schemaVersion: 1,
          path: 'src/index.ts',
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
    );
    const first = await handleFacts({ action: 'status', path: project.root });
    await handleFacts({
      action: 'submit',
      path: project.root,
      file: attested,
      resolutionEpoch: (first.summary as FactsStatusSummary).resolutionEpoch,
      actor: 'first-reader',
    });
    expect(
      (
        (await handleFacts({ action: 'status', path: project.root }))
          .summary as FactsStatusSummary
      ).pendingAttestations,
    ).toBe(1);

    project.remove('src/index.ts');
    // Any submit sweeps what the tree no longer holds; this one is about
    // another file entirely.
    const later = await handleFacts({ action: 'status', path: project.root });
    await handleFacts({
      action: 'submit',
      path: project.root,
      file: project.submission(
        'other.json',
        JSON.stringify([project.facts('src/thing.ts')]),
      ),
      resolutionEpoch: (later.summary as FactsStatusSummary).resolutionEpoch,
    });

    // Status already hides a page whose file is gone, so the store is where
    // the staleness shows: a page nobody can ever confirm, kept forever.
    expect(
      readPendingStore(resolveFactsStorePaths(project.root).pendingDirectory)
        .pages.size,
    ).toBe(0);
  });
});
