import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

/** Windows filenames cannot hold a control character, so the fixture file cannot be created there. */
const controlCharacterPathsUnsupported = process.platform === 'win32';

const CONFIG = (facts: unknown): string =>
  JSON.stringify({
    version: '2.0',
    adapters: { mode: 'auto', enabled: [] },
    rules: {},
    ...(facts === undefined ? {} : { facts }),
  });

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-list-'));
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
 * @returns The status summary and data.
 */
async function status(): Promise<{
  summary: FactsStatusSummary;
  data: FactsStatusData | undefined;
}> {
  const result = await handleFacts({ action: 'status', path: project.root });
  return {
    summary: result.summary as FactsStatusSummary,
    data: result.data as FactsStatusData | undefined,
  };
}

describe('facts status extraction list', () => {
  it('writes the in-scope files that need extracting, one per line', async () => {
    const result = await status();

    const lines = readFileSync(result.summary.extractionList.path, 'utf8')
      .split('\n')
      .filter((line) => line !== '');
    expect(lines).toEqual(['src/index.ts', 'src/thing.ts']);
    expect(result.summary.extractionList.count).toBe(2);
  });

  it('leaves out-of-scope files out of the list', async () => {
    const result = await status();

    expect(
      readFileSync(result.summary.extractionList.path, 'utf8'),
    ).not.toContain('notes.md');
  });

  it.skipIf(controlCharacterPathsUnsupported)(
    'drops a file whose name a line-oriented list cannot carry, and counts it',
    async () => {
      // A `**` glob cannot match a newline (its `.` excludes one), but `src/*`
      // can, so this is how such a file actually reaches the declared scope.
      project.write('.filid/config.json', CONFIG({ covers: ['src/*'] }));
      project.write('src/two\nlines.ts', 'export const odd = 1;\n');

      const result = await status();

      const body = readFileSync(result.summary.extractionList.path, 'utf8');
      expect(result.summary.extractionList.unrepresentable).toBe(1);
      expect(body).not.toContain('two\nlines.ts');
      // Still reported as a file with no facts, so it is never read as "fine".
      expect(result.data?.missing.paths).toContain('src/two\nlines.ts');
    },
  );

  it('rewrites the list on every call rather than appending', async () => {
    const before = await status();
    expect(before.summary.extractionList.count).toBe(2);

    rmSync(join(project.root, 'src', 'index.ts'));
    const after = await status();

    const lines = readFileSync(after.summary.extractionList.path, 'utf8')
      .split('\n')
      .filter((line) => line !== '');
    expect(lines).toEqual(['src/thing.ts']);
    expect(after.summary.extractionList.count).toBe(1);
  });

  it('survives two sessions writing the same list, and recovers by epoch', async () => {
    // Two sessions share one project, so they share one list file. The write is
    // an atomic replace, so a reader sees one whole list or the other — and
    // both are lists of the CURRENT state, so reading the other session's is
    // harmless. What is not harmless is submitting against an epoch the tree
    // has since left, and that is exactly what facts-epoch-moved catches.
    const before = await status();
    const staleEpoch = before.summary.resolutionEpoch;
    project.write('src/added.ts', 'export const added = 1;\n');

    const after = await status();
    const lines = readFileSync(after.summary.extractionList.path, 'utf8')
      .split('\n')
      .filter((line) => line !== '');

    expect(after.summary.extractionList.path).toBe(
      before.summary.extractionList.path,
    );
    expect(lines).toContain('src/added.ts');

    const file = project.submission('batch.json', JSON.stringify([]));
    const submitted = await handleFacts({
      action: 'submit',
      path: project.root,
      file,
      resolutionEpoch: staleEpoch,
    });

    expect(
      (submitted.summary as { epochMoved: boolean }).epochMoved,
    ).toBe(true);
    expect(submitted.diagnostics.map((one) => one.code)).toEqual([
      'facts-epoch-moved',
    ]);
  });

  it('lists the default scope when the project declares none', async () => {
    project.write('.filid/config.json', CONFIG(undefined));

    const result = await status();

    expect(result.summary.scopeSource).toBe('default');
    expect(result.summary.extractionList.count).toBe(2);
  });

  it('reports an empty list when the scope covers nothing', async () => {
    project.write('.filid/config.json', CONFIG({ covers: [] }));

    const result = await status();

    expect(result.summary.extractionList.count).toBe(0);
  });
});
