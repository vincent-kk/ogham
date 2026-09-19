import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_PROJECT_STATES,
  FACTS_REJECTION_CODES,
} from '../../../../constants/facts.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import {
  resolveFactsStorePaths,
  writeFactsShardFile,
} from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsStatusData,
  FactsStatusSummary,
  FactsSubmitData,
  FactsSubmitSummary,
} from '../../../../mcp/tools/facts/index.js';
import { seedFacts } from '../../../integration/helpers/seedFacts.js';

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
    ...(facts === undefined ? {} : { facts }),
  });

/**
 * Digest a file the way a facts record spells a resolution input.
 * @param absolutePath File to hash.
 * @returns `sha256:<hex>` of its bytes.
 */
function sha256Of(absolutePath: string): string {
  return `sha256:${createHash('sha256').update(readFileSync(absolutePath)).digest('hex')}`;
}

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-tool-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': "export { thing } from './thing.js';\n",
    'src/thing.ts': 'export const thing = 1;\n',
    'notes.md': '# notes\n',
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
 * Run status and narrow the payload.
 * @returns The status summary, data and envelope status.
 */
async function status(): Promise<{
  summary: FactsStatusSummary;
  data: FactsStatusData | undefined;
  status: string;
}> {
  const result = await handleFacts({ action: 'status', path: project.root });
  return {
    summary: result.summary as FactsStatusSummary,
    data: result.data as FactsStatusData | undefined,
    status: result.status,
  };
}

/**
 * Submit a record batch and narrow the payload.
 * @param records Records to serialize into a submission file.
 * @param epoch Epoch to submit against; defaults to the current one.
 * @returns The submit summary, data, envelope status and diagnostic codes.
 */
async function submit(
  records: unknown[],
  epoch?: string,
): Promise<{
  summary: FactsSubmitSummary;
  data: FactsSubmitData | undefined;
  status: string;
  codes: string[];
}> {
  const file = project.submission(
    `batch-${Math.random().toString(36).slice(2)}.json`,
    JSON.stringify(records),
  );
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: epoch ?? (await status()).summary.resolutionEpoch,
  });
  return {
    summary: result.summary as FactsSubmitSummary,
    data: result.data as FactsSubmitData | undefined,
    status: result.status,
    codes: result.diagnostics.map((diagnostic) => diagnostic.code),
  };
}

describe('facts status', () => {
  it('reports facts-uninitialized when no scope is declared', async () => {
    project.write('.filid/config.json', CONFIG(undefined));

    const result = await status();

    expect(result.summary.projectState).toBe(
      FACTS_PROJECT_STATES.UNINITIALIZED,
    );
    expect(result.status).toBe(TOOL_STATUSES.UNSUPPORTED);
  });

  it('lists every covered file as missing before anything is submitted', async () => {
    const result = await status();

    expect(result.summary.projectState).toBe(FACTS_PROJECT_STATES.READY);
    expect(result.data?.missing.paths).toEqual([
      'src/index.ts',
      'src/thing.ts',
    ]);
    expect(result.summary.unsupported).toBe(1);
  });

  it('sees a file deeper than the built-in traversal cap, as the snapshot does', async () => {
    project.write('.filid/config.json', CONFIG({ covers: ['**'] }));
    project.write('src/a/b/c/d/e/f/g/h/i/j/deep.ts', 'export const d = 1;\n');

    const result = await status();

    expect(result.data?.missing.paths).toContain(
      'src/a/b/c/d/e/f/g/h/i/j/deep.ts',
    );
  });

  it('honours structure.additionalExcludedDirectories from project config', async () => {
    project.write(
      '.filid/config.json',
      JSON.stringify({
        version: '2.0',
        adapters: { mode: 'auto', enabled: [] },
        rules: {},
        structure: { additionalExcludedDirectories: ['generated'] },
        facts: { covers: ['**'] },
      }),
    );
    project.write('src/generated/out.ts', 'export const g = 1;\n');

    const result = await status();

    expect(result.data?.missing.paths).not.toContain('src/generated/out.ts');
  });

  // mkfifo is POSIX-only; Windows cannot stage this record.
  it.skipIf(process.platform === 'win32')(
    'still answers when a stored record names a FIFO as a resolution input',
    async () => {
      project.write('.filid/config.json', CONFIG({ covers: ['**'] }));
      const fifo = join(project.outside, 'stored.fifo');
      execFileSync('mkfifo', [fifo]);
      const paths = resolveFactsStorePaths(project.root);
      const key = paths.pathDigest('src/thing.ts');
      writeFactsShardFile(
        paths.directory,
        paths.shardFileName(key),
        {
          [key]: {
            schemaVersion: 1,
            resolutionEpoch: 'sha256:whatever',
            rejectedClaims: 0,
            facts: {
              ...project.facts('src/thing.ts'),
              provenance: {
                tool: 't',
                version: '1',
                command: '',
                tier: 'tool',
                resolutionInputs: [
                  { path: fifo, contentHash: `sha256:${'0'.repeat(64)}` },
                ],
              },
            },
          },
        },
        null,
      );

      const result = await status();

      expect(result.data?.needsResolution.paths).toContain('src/thing.ts');
    },
    10000,
  );

  it('states the output requirement instead of naming a server-side directory', async () => {
    const result = await status();

    expect(result.summary.outputRequirement).toContain('outside the project');
    expect(result.summary.outputRequirement).not.toContain(project.root);
  });
});

describe('facts submit', () => {
  it('stores a record that passes every check and turns the file exact', async () => {
    const result = await submit([project.facts('src/thing.ts')]);

    expect(result.summary.accepted).toBe(1);
    expect((await status()).summary.exact).toBe(1);
  });

  it('refuses a record whose content hash no longer matches the file', async () => {
    const record = project.facts('src/thing.ts');
    project.write('src/thing.ts', 'export const thing = 2;\n');

    const result = await submit([record]);

    expect(result.summary.accepted).toBe(0);
    expect(result.data?.rejected[0]?.code).toBe(
      FACTS_REJECTION_CODES.HASH_MISMATCH,
    );
  });

  it('refuses a record for a file outside the declared scope', async () => {
    const result = await submit([project.facts('notes.md')]);

    expect(result.summary.accepted).toBe(0);
    expect(result.data?.rejected[0]?.code).toBe(
      FACTS_REJECTION_CODES.OUT_OF_SCOPE,
    );
  });

  it('drops one reference whose string is absent and stores the rest', async () => {
    const record = project.facts('src/index.ts', {
      references: [
        {
          specifier: './thing.js',
          kind: 'static',
          resolved: { path: 'src/thing.ts' },
        },
        {
          specifier: './ghost.js',
          kind: 'static',
          resolved: { path: 'src/thing.ts' },
        },
      ],
    });

    const result = await submit([record]);

    expect(result.summary.accepted).toBe(1);
    expect(result.data?.rejected.map((entry) => entry.code)).toEqual([
      FACTS_REJECTION_CODES.REFERENCE_ABSENT,
    ]);
    expect((await status()).data?.uncertain.paths).toEqual(['src/index.ts']);
  });

  it('keeps a reference whose string sits on a different line than reported', async () => {
    project.write('src/index.ts', "\n\nexport { thing } from './thing.js';\n");
    const record = project.facts('src/index.ts', {
      references: [
        {
          specifier: './thing.js',
          line: 1,
          kind: 'static',
          resolved: { path: 'src/thing.ts' },
        },
      ],
    });

    const result = await submit([record]);

    expect(result.summary.accepted).toBe(1);
    expect(result.summary.rejectedClaims).toBe(0);
  });

  it('stores a valid but unscanned resolution as external, carrying no edge', async () => {
    project.write('.filid/config.json', CONFIG({ covers: ['**'] }));
    const record = project.facts('src/index.ts', {
      references: [
        {
          specifier: './thing.js',
          kind: 'static',
          resolved: { path: '.filid/config.json' },
        },
      ],
    });

    const result = await submit([record]);

    expect(result.summary.accepted).toBe(1);
    expect(result.summary.rejectedClaims).toBe(0);
  });

  it('stores nothing and names the moved paths when the epoch is stale', async () => {
    const stale = (await status()).summary.resolutionEpoch;
    project.write('src/added.ts', 'export const added = 1;\n');

    const result = await submit([project.facts('src/thing.ts')], stale);

    expect(result.summary.epochMoved).toBe(true);
    expect(result.summary.accepted).toBe(0);
    expect(result.codes).toEqual([FACTS_DIAGNOSTIC_CODES.EPOCH_MOVED]);
    expect(result.data?.added.paths).toEqual(['src/added.ts']);
  });

  it('reports facts-tree-unstable once the tree has moved three times under a caller', async () => {
    const stale = (await status()).summary.resolutionEpoch;
    const codes: string[] = [];
    for (const name of ['a', 'b', 'c', 'd']) {
      project.write(`src/${name}.ts`, 'export const x = 1;\n');
      codes.push((await submit([], stale)).codes[0] as string);
    }

    expect(codes).toEqual([
      FACTS_DIAGNOSTIC_CODES.EPOCH_MOVED,
      FACTS_DIAGNOSTIC_CODES.EPOCH_MOVED,
      FACTS_DIAGNOSTIC_CODES.EPOCH_MOVED,
      FACTS_DIAGNOSTIC_CODES.TREE_UNSTABLE,
    ]);
  });

  it('never reaches facts-tree-unstable while the tree stands still', async () => {
    const stale = (await status()).summary.resolutionEpoch;
    project.write('src/moved-once.ts', 'export const x = 1;\n');
    const codes: string[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1)
      codes.push((await submit([], stale)).codes[0] as string);

    expect(new Set(codes)).toEqual(
      new Set([FACTS_DIAGNOSTIC_CODES.EPOCH_MOVED]),
    );
  });

  it('accepts the second batch of a split submission against the same epoch', async () => {
    const declared = project.submission('declared-input.json', '{"x":1}');
    const inputHash = sha256Of(declared);
    const epoch = (await status()).summary.resolutionEpoch;
    const withInput = (path: string) =>
      project.facts(path, {
        provenance: {
          tool: 'test-extractor',
          version: '1.0.0',
          command: 'test',
          tier: 'tool',
          resolutionInputs: [{ path: declared, contentHash: inputHash }],
        },
      });

    const first = await submit([withInput('src/thing.ts')], epoch);
    const second = await submit([withInput('src/index.ts')], epoch);

    expect(first.summary.accepted).toBe(1);
    expect(second.summary.epochMoved).toBe(false);
    expect(second.summary.accepted).toBe(1);
  });

  it('refuses a record whose declared input no longer hashes as declared', async () => {
    const declared = project.submission('declared-input.json', '{"x":1}');
    const record = project.facts('src/thing.ts', {
      provenance: {
        tool: 'test-extractor',
        version: '1.0.0',
        command: 'test',
        tier: 'tool',
        resolutionInputs: [
          { path: declared, contentHash: `sha256:${'0'.repeat(64)}` },
        ],
      },
    });

    const result = await submit([record]);

    expect(result.summary.accepted).toBe(0);
    expect(result.data?.rejected[0]?.code).toBe(
      FACTS_REJECTION_CODES.RESOLUTION_INPUT_STALE,
    );
  });

  it('flips only the declaring record to needs-resolution when its input changes', async () => {
    const declared = project.submission('declared-input.json', '{"x":1}');
    const epoch = (await status()).summary.resolutionEpoch;
    await submit(
      [
        project.facts('src/thing.ts', {
          provenance: {
            tool: 'test-extractor',
            version: '1.0.0',
            command: 'test',
            tier: 'tool',
            resolutionInputs: [
              { path: declared, contentHash: sha256Of(declared) },
            ],
          },
        }),
        project.facts('src/index.ts'),
      ],
      epoch,
    );
    writeFileSync(declared, '{"x":2}');

    const after = await status();

    expect(after.data?.needsResolution.paths).toEqual(['src/thing.ts']);
    expect(after.summary.exact).toBe(1);
  });

  it('removes the record of a file that left the declared scope', async () => {
    await submit([project.facts('src/thing.ts')]);
    project.write('.filid/config.json', CONFIG({ covers: ['src/index.ts'] }));

    const result = await submit([]);

    expect(result.summary.removed).toBe(1);
    expect((await status()).summary.exact).toBe(0);
  });
});

// The fixture roots this project behind a link, which Windows will not create
// for an unprivileged process.
describe.skipIf(process.platform === 'win32')(
  'facts under a symlinked project root',
  () => {
    beforeEach(() => {
      project = createFactsProject(
        {
          'src/index.ts': "export { thing } from './thing.js';\n",
          'src/thing.ts': 'export const thing = 1;\n',
          'package.json': '{"name":"p"}',
          '.filid/config.json': CONFIG({ covers: ['src/**'] }),
        },
        { throughSymlink: true },
      );
    });

    it('moves the epoch when a manifest changes, and names it', async () => {
      const before = (await status()).summary.resolutionEpoch;

      project.write(
        'package.json',
        '{"name":"p","imports":{"#a":"./src/a.js"}}',
      );
      const after = await status();

      expect(after.summary.resolutionEpoch).not.toBe(before);
    });

    it('turns stored records needs-resolution when a manifest changes', async () => {
      await submit([project.facts('src/thing.ts')]);
      expect((await status()).summary.exact).toBe(1);

      project.write(
        'package.json',
        '{"name":"p","imports":{"#a":"./src/a.js"}}',
      );
      const after = await status();

      expect(after.summary.exact).toBe(0);
      expect(after.data?.needsResolution.paths).toEqual(['src/thing.ts']);
    });

    it('names the manifest in changedResolutionInputs of a stale submit', async () => {
      const stale = (await status()).summary.resolutionEpoch;
      project.write(
        'package.json',
        '{"name":"p","imports":{"#a":"./src/a.js"}}',
      );

      const result = await submit([], stale);

      expect(result.summary.epochMoved).toBe(true);
      expect(result.data?.changedResolutionInputs.paths).toEqual([
        'package.json',
      ]);
    });

    it('still binds record content hashes and scope under the linked root', async () => {
      const result = await submit([project.facts('src/thing.ts')]);

      expect(result.summary.accepted).toBe(1);
      expect(result.summary.rejectedClaims).toBe(0);
    });
  },
);

describe('seedFacts helper', () => {
  it('leaves every covered file exact', async () => {
    project.write('.filid/config.json', CONFIG({ covers: ['**'] }));

    const seeded = await seedFacts(project.root);

    const result = await status();
    expect(seeded.accepted).toBe(result.summary.coveredFiles);
    expect(result.summary.missing).toBe(0);
    expect(result.summary.exact).toBe(seeded.accepted);
  });
});
