import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FACTS_PROJECT_STATES } from '../../constants/facts.js';
import { TOOL_STATUSES } from '../../constants/toolEnvelope.js';
import {
  FileFactsSchema,
  readFactsStore,
  resolveFactsStorePaths,
} from '../../core/facts/index.js';
import { extractFileFacts } from '../../factsExtractor/index.js';
import type { FileFactsExtraction } from '../../factsExtractor/index.js';
import { readFileList } from '../../factsExtractor/utils/input/readFileList.js';
import { handleFacts } from '../../mcp/tools/facts/index.js';
import type {
  FactsResult,
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

/** The JSX file whose text holds an apostrophe ahead of a later import. */
const JSX_APOSTROPHE_FILE = 'src/Notice.tsx';

/** The file whose specifier crosses a line continuation, so its `sourceText` spans two lines. */
const LINE_CONTINUATION_FILE = 'src/continued.ts';

/** Source files the facts scope covers, one reference shape each. */
const SOURCE_FILES: Readonly<Record<string, string>> = {
  'src/index.ts': "export { thing } from './thing.js';\n",
  'src/thing.ts': 'export const thing = 1;\n',
  'src/shape.ts': 'export interface Shape {\n  size: number;\n}\n',
  'src/lazy.ts': 'export const lazy = 2;\n',
  'src/consumer.ts': [
    "import { z } from 'zod';",
    '',
    "import type { Shape } from './shape.js';",
    "import { thing } from './thing.js';",
    '',
    "export const loadLazy = () => import('./lazy.js');",
    'export const shape: Shape = { size: thing };',
    'export const schema = z.number();',
    '',
  ].join('\n'),
  'src/thing.test.ts': [
    "import { describe, expect, it } from 'vitest';",
    '',
    "import { thing } from './thing.js';",
    '',
    "describe('thing', () => {",
    "  it('is one', () => expect(thing).toBe(1));",
    "  it('is a number', () => expect(typeof thing).toBe('number'));",
    '});',
    '',
  ].join('\n'),
  [LINE_CONTINUATION_FILE]: [
    "import { thing } from './thing\\",
    ".js';",
    '',
    'export const continued = thing;',
    '',
  ].join('\n'),
  [JSX_APOSTROPHE_FILE]: [
    "import { thing } from './thing.js';",
    '',
    "export const Notice = () => <p>don't {thing}</p>;",
    "export const loadLazy = () => import('./lazy.js');",
    '',
  ].join('\n'),
};

/** Files outside the facts scope: the resolution inputs and the scope declaration. */
const PROJECT_FILES: Readonly<Record<string, string>> = {
  'package.json': JSON.stringify({
    name: 'facts-join-fixture',
    version: '1.0.0',
    type: 'module',
    dependencies: { zod: '^3.0.0' },
  }),
  'tsconfig.json': JSON.stringify({
    compilerOptions: { module: 'NodeNext', jsx: 'react-jsx', strict: true },
    include: ['src'],
  }),
  '.filid/config.json': JSON.stringify({
    version: '2.0',
    adapters: { mode: 'auto', enabled: [] },
    rules: {},
    facts: { covers: ['src/**'] },
  }),
};

/** Covered source paths in the order the extractor emits its records. */
const SOURCE_PATHS = Object.keys(SOURCE_FILES).sort();

/** Value restored after each case; the facts store lands under this directory. */
const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-join-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({ ...SOURCE_FILES, ...PROJECT_FILES });
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
  cleanupFactsProjects();
});

/**
 * Extract exactly the files the server put in its extraction list.
 *
 * The CLI reads that list through `--files-from`; this runs the same list
 * through the library entry, so the seam under test is the server's scope
 * meeting the extractor's input.
 * @returns The extraction, exactly as the CLI would serialize its records.
 */
async function extractSources(): Promise<FileFactsExtraction> {
  const { summary } = await status();
  const listed = readFileList(
    readFileSync(summary.extractionList.path, 'utf8'),
  );
  return extractFileFacts(
    project.root,
    listed,
    `filid-facts --root . --files-from <list>`,
  );
}

/**
 * Run `facts status` on the project.
 * @returns The envelope, with summary and data narrowed to the status shapes.
 */
async function status(): Promise<{
  result: FactsResult;
  summary: FactsStatusSummary;
  data: FactsStatusData | undefined;
}> {
  const result = await handleFacts({ action: 'status', path: project.root });
  return {
    result,
    summary: result.summary as FactsStatusSummary,
    data: result.data as FactsStatusData | undefined,
  };
}

/**
 * Submit the extractor's records through a file outside the project, against
 * the epoch `status` returns.
 * @param extraction Extraction whose records are serialized as the CLI does.
 * @returns The envelope, with summary and data narrowed to the submit shapes.
 */
async function submitExtraction(extraction: FileFactsExtraction): Promise<{
  result: FactsResult;
  summary: FactsSubmitSummary;
  data: FactsSubmitData | undefined;
}> {
  const file = project.submission(
    'facts.json',
    JSON.stringify(extraction.records),
  );
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (await status()).summary.resolutionEpoch,
  });
  return {
    result,
    summary: result.summary as FactsSubmitSummary,
    data: result.data as FactsSubmitData | undefined,
  };
}

describe('facts extractor output submitted to the facts tool', () => {
  it('extracts the list the server wrote, with no path it cannot carry', async () => {
    const { summary } = await status();
    expect(summary.extractionList).toMatchObject({
      count: SOURCE_PATHS.length,
      unrepresentable: 0,
    });
    expect(
      readFileList(readFileSync(summary.extractionList.path, 'utf8')).sort(),
    ).toEqual([...SOURCE_PATHS].sort());
  });

  it('emits one record per source file, each valid under the strict server schema', async () => {
    const extraction = await extractSources();

    expect(extraction.rejected).toEqual([]);
    expect(extraction.unreadable).toEqual([]);
    expect(extraction.records.map(({ path }) => path)).toEqual(SOURCE_PATHS);
    const schemaFailures = extraction.records.flatMap((record) => {
      const parsed = FileFactsSchema.safeParse(record);
      return parsed.success
        ? []
        : [{ path: record.path, issues: parsed.error.issues }];
    });
    expect(schemaFailures).toEqual([]);
  });

  it('has every record accepted with no record or claim rejected', async () => {
    const submitted = await submitExtraction(await extractSources());

    expect(submitted.result.diagnostics).toEqual([]);
    expect(submitted.result.status).toBe(TOOL_STATUSES.OK);
    expect(submitted.data?.rejected).toEqual([]);
    expect(submitted.data?.rejectedTruncated).toBe(0);
    expect(submitted.summary).toMatchObject({
      accepted: SOURCE_PATHS.length,
      rejectedRecords: 0,
      rejectedClaims: 0,
      epochMoved: false,
    });
  });

  it('leaves every covered file exact, the JSX apostrophe and line continuation files included', async () => {
    await submitExtraction(await extractSources());

    const after = await status();

    expect(after.summary.projectState).toBe(FACTS_PROJECT_STATES.READY);
    expect(after.summary.coveredFiles).toBe(SOURCE_PATHS.length);
    expect({
      missing: after.data?.missing.paths,
      needsResolution: after.data?.needsResolution.paths,
      uncertain: after.data?.uncertain.paths,
      toolError: after.data?.toolError.paths,
      rejected: after.data?.rejected.items,
    }).toEqual({
      missing: [],
      needsResolution: [],
      uncertain: [],
      toolError: [],
      rejected: [],
    });
    expect(after.summary.exact).toBe(SOURCE_PATHS.length);
    const storedRecords = [
      ...readFactsStore(
        resolveFactsStorePaths(project.root).directory,
      ).records.values(),
    ];
    const continued = storedRecords.find(
      ({ facts }) => facts.path === LINE_CONTINUATION_FILE,
    );
    expect(continued?.rejectedClaims).toEqual([]);
    expect(continued?.facts.references).toEqual([
      expect.objectContaining({
        sourceText: "'./thing\\\n.js'",
        candidateLines: [1],
      }),
    ]);
    const stored = storedRecords.find(
      ({ facts }) => facts.path === JSX_APOSTROPHE_FILE,
    );
    expect(stored?.rejectedClaims).toEqual([]);
    const storedReferences = stored?.facts.references.map(
      ({ specifier, kind, certainty, resolved }) => ({
        specifier,
        kind,
        certainty,
        resolved,
      }),
    );
    expect(storedReferences).toHaveLength(2);
    expect(storedReferences).toEqual(
      expect.arrayContaining([
        {
          specifier: './thing.js',
          kind: 'static',
          certainty: undefined,
          resolved: { path: 'src/thing.ts' },
        },
        {
          specifier: './lazy.js',
          kind: 'dynamic',
          certainty: undefined,
          resolved: { path: 'src/lazy.ts' },
        },
      ]),
    );
  });
});
