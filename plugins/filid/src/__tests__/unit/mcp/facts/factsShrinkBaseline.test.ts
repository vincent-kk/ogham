import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FACTS_ADJUDICATION_ORIGINS } from '../../../../constants/facts.js';
import type { FileFacts } from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsOpenItem,
  FactsStatusData,
  FactsStatusSummary,
  FactsSubmitSummary,
} from '../../../../mcp/tools/facts/index.js';

import {
  cleanupFactsProjects,
  createFactsProject,
} from './helpers/createFactsProject.js';
import type { FactsProject } from './helpers/createFactsProject.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

/** The specifier every case here walks back. */
const SPECIFIER = './thing.js';

/** The same specifier as a `require` call spells it, quotes included. */
const CALL_TEXT = `require('${SPECIFIER}')`;

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-baseline-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': `export { thing } from '${SPECIFIER}';\n`,
    'src/calls.ts': `const a = ${CALL_TEXT};\nconst b = ${CALL_TEXT};\n`,
    'src/thing.ts': 'export const thing = 1;\n',
    'src/other.ts': 'export const other = 1;\n',
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
 * Submit one record through the tool, at the epoch status currently reports.
 * @param facts The record to submit, already built against the file on disk.
 * @returns The submit summary.
 */
async function submit(facts: FileFacts): Promise<FactsSubmitSummary> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file: project.submission(
      `batch-${Math.random().toString(36).slice(2)}.json`,
      JSON.stringify([facts]),
    ),
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
  return result.summary as FactsSubmitSummary;
}

/**
 * A record claiming one plainly spelled reference of `src/index.ts`.
 * @param target In-project path it resolves to.
 * @returns The record.
 */
function indexClaiming(target: string): FileFacts {
  return project.facts('src/index.ts', {
    references: [
      { specifier: SPECIFIER, kind: 'static', resolved: { path: target } },
    ],
  });
}

/**
 * A record reporting that the tool could not read the file.
 * @param path Project-relative POSIX path of the unreadable file.
 * @returns The record.
 */
function unreadable(path: string): FileFacts {
  return project.facts(path, {
    references: [],
    toolError: { message: 'the modelled tool could not read it' },
  });
}

/**
 * Items the side table holds unsettled, as status reports them.
 * @returns Every open item across the project.
 */
async function openItems(): Promise<FactsOpenItem[]> {
  const result = await handleFacts({ action: 'status', path: project.root });
  return (result.data as FactsStatusData).unadjudicated.items;
}

describe('a healthy record replacing a toolError record', () => {
  it('opens an item when it re-points an edge the baseline carried', async () => {
    await submit(indexClaiming('src/thing.ts'));
    await submit(unreadable('src/index.ts'));

    const summary = await submit(indexClaiming('src/other.ts'));

    expect(summary.openedItems).toBe(1);
    expect(await openItems()).toEqual([
      expect.objectContaining({
        path: 'src/index.ts',
        reference: SPECIFIER,
        resolvedPath: 'src/thing.ts',
        origin: FACTS_ADJUDICATION_ORIGINS.RESOLUTION_CHANGED,
      }),
    ]);
  });

  it('opens an item when it drops an edge the baseline carried', async () => {
    await submit(indexClaiming('src/thing.ts'));
    await submit(unreadable('src/index.ts'));

    const summary = await submit(
      project.facts('src/index.ts', { references: [] }),
    );

    expect(summary.openedItems).toBe(1);
    expect(await openItems()).toEqual([
      expect.objectContaining({
        resolvedPath: 'src/thing.ts',
        origin: FACTS_ADJUDICATION_ORIGINS.COVERAGE_SHRANK,
      }),
    ]);
  });

  it('counts occurrences by how the baseline spelled the reference', async () => {
    const kept = {
      specifier: SPECIFIER,
      sourceText: CALL_TEXT,
      kind: 'static' as const,
      resolved: { path: 'src/thing.ts' },
    };
    const dropped = { ...kept, resolved: { path: 'src/other.ts' } };
    await submit(
      project.facts('src/calls.ts', { references: [kept, dropped] }),
    );
    await submit(unreadable('src/calls.ts'));

    const summary = await submit(
      project.facts('src/calls.ts', { references: [kept] }),
    );

    expect(summary.openedItems).toBe(1);
    expect(await openItems()).toEqual([
      expect.objectContaining({
        path: 'src/calls.ts',
        reference: CALL_TEXT,
        resolvedPath: 'src/other.ts',
      }),
    ]);
  });
});
