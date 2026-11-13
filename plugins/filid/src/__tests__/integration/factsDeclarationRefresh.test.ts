import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAdapterRegistry } from '../../adapters/index.js';
import { createDefaultConfig } from '../../core/infra/configLoader/index.js';
import { createProjectSnapshot } from '../../core/projectSnapshot/index.js';
import { extractFileFacts } from '../../factsExtractor/index.js';
import type { FileFacts } from '../../factsExtractor/index.js';
import { handleFacts } from '../../mcp/tools/facts/index.js';
import {
  cleanupFactsProjects,
  createFactsProject,
} from '../unit/mcp/facts/helpers/createFactsProject.js';
import type { FactsProject } from '../unit/mcp/facts/helpers/createFactsProject.js';

import { FIXTURE_INTENT } from './reviewFlow/helpers/reviewFlowRepositoryFiles.js';

/** The state-directory override restored after each isolated store test. */
const originalConfigDir = process.env.CLAUDE_CONFIG_DIR;
/** Temporary storage root for this case's facts cache. */
let stateRoot: string;
/** Temporary source project and outside submission directory. */
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-declaration-refresh-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'package.json': '{"name":"declaration-refresh","type":"module"}',
    'INTENT.md': FIXTURE_INTENT,
    'index.d.ts': "export type { A } from './types/a';\n",
    'types/INTENT.md': FIXTURE_INTENT,
    'types/a.d.ts': 'export interface A { value: string }\n',
  });
});

afterEach(() => {
  if (originalConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = originalConfigDir;
  cleanupFactsProjects();
  rmSync(stateRoot, { recursive: true, force: true });
});

/** @param records Complete replacements for their respective files. @returns The public submission response. */
async function submit(records: readonly FileFacts[]) {
  const status = await handleFacts({ action: 'status', path: project.root });
  if (!('extractionList' in status.summary))
    throw new Error('Expected facts status');
  return handleFacts({
    action: 'submit',
    path: project.root,
    file: project.submission('records.json', JSON.stringify(records)),
    resolutionEpoch: status.summary.resolutionEpoch,
  });
}

/** @returns An exact-epoch record set carrying the unresolved result from an older extractor. */
async function seedUnresolved() {
  const extracted = await extractFileFacts(
    project.root,
    ['index.d.ts', 'types/a.d.ts'],
    'fixture-extraction',
  );
  const records = extracted.records.map((record) =>
    record.path === 'index.d.ts'
      ? {
          ...record,
          references: record.references.map((reference) => ({
            ...reference,
            resolved: { unresolved: true as const },
          })),
        }
      : record,
  );
  const result = await submit(records);
  expect(result.summary).toMatchObject({
    accepted: 2,
    rejectedRecords: 0,
    rejectedClaims: 0,
  });
}

describe('declaration facts refresh: regressions', () => {
  it('replaces a stored unresolved reference with an extracted edge and exact graph', async () => {
    await seedUnresolved();
    const before = await createProjectSnapshot(
      project.root,
      createAdapterRegistry(),
      createDefaultConfig(),
    );
    expect(before.dependencyGraph.certainty).toBe('indeterminate');
    expect(before.dependencyGraph.edges).toHaveLength(0);
    const extracted = await extractFileFacts(
      project.root,
      ['index.d.ts'],
      'explicit-refresh',
    );
    expect(extracted.records[0]?.references[0]?.resolved).toEqual({
      path: 'types/a.d.ts',
    });
    expect((await submit(extracted.records)).summary).toMatchObject({
      accepted: 1,
      rejectedRecords: 0,
      rejectedClaims: 0,
    });
    const after = await createProjectSnapshot(
      project.root,
      createAdapterRegistry(),
      createDefaultConfig(),
    );
    expect(after.dependencyGraph.certainty).toBe('exact');
    expect(after.dependencyGraph.unknownFiles).toEqual([]);
    expect(after.dependencyGraph.edges).toContainEqual(
      expect.objectContaining({
        fromFractalPath: project.root,
        toFractalPath: join(project.root, 'types'),
      }),
    );
  });
});

describe('declaration facts refresh: controls', () => {
  it('does not automatically re-extract a current-epoch unresolved record', async () => {
    await seedUnresolved();
    const status = await handleFacts({ action: 'status', path: project.root });
    expect(status.summary).toMatchObject({
      exact: 2,
      extractionList: { count: 0 },
    });
    const snapshot = await createProjectSnapshot(
      project.root,
      createAdapterRegistry(),
      createDefaultConfig(),
    );
    expect(snapshot.dependencyGraph.certainty).toBe('indeterminate');
    expect(snapshot.dependencyGraph.unknownFiles).toContainEqual({
      path: 'index.d.ts',
      causes: ['unresolved-local-dependency'],
    });
  });
});
