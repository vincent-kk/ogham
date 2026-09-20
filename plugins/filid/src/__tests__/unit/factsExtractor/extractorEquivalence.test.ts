import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { portableRelative } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { ecmascriptStructureAdapter } from '../../../adapters/ecmascript/index.js';
import { extractFileFacts } from '../../../factsExtractor/index.js';
import { INTENT_GAP_REVIEW_REPOSITORY } from '../../integration/reviewFlow/helpers/reviewFlowRepositoryFiles.js';
import { writeSharedUnitRestructureProject } from '../../integration/reviewFlow/helpers/writeSharedUnitRestructureProject.js';
import { writeReviewStateFixtureFile } from '../mcp/reviewState/helpers/writeReviewStateFixtureFile.js';

import { listAdapterMismatches } from './helpers/listAdapterMismatches.js';
import { writeUncertaintyProject } from './helpers/writeUncertaintyProject.js';

/** Package root of this plugin; `src/` below it is the largest real input. */
const PACKAGE_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

/** Temporary projects removed after each case. */
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

/**
 * Extract every source file the adapter discovers under a root.
 * @param projectRoot Absolute project root.
 * @param within Optional project-relative prefix the files must start with.
 * @returns The extraction of those files.
 */
async function extractDiscovered(projectRoot: string, within = '') {
  const files = (
    await ecmascriptStructureAdapter.discoverSourceFiles(projectRoot)
  ).filter((path) =>
    portableRelative(projectRoot, path)
      .replaceAll('\\', '/')
      .startsWith(within),
  );
  return extractFileFacts(projectRoot, files, 'filid-facts --all');
}

describe('records carry the values the ECMAScript adapter reports', () => {
  it('matches the adapter on every source file of this plugin', async () => {
    const extraction = await extractDiscovered(PACKAGE_ROOT, 'src/');
    expect(extraction.records.length).toBeGreaterThan(500);
    expect(extraction.rejected).toEqual([]);
    expect(
      await listAdapterMismatches(PACKAGE_ROOT, extraction.records),
    ).toEqual([]);
  }, 120_000);

  it('matches the adapter on the harness restructure project', async () => {
    const root = await writeSharedUnitRestructureProject();
    temporaryRoots.push(root);
    const extraction = await extractDiscovered(root);
    expect(extraction.records.map(({ path }) => path)).toContain(
      'domain/a/value.ts',
    );
    expect(await listAdapterMismatches(root, extraction.records)).toEqual([]);
  });

  it('matches the adapter on the harness review repository', async () => {
    const root = mkdtempSync(join(tmpdir(), 'filid-facts-review-'));
    temporaryRoots.push(root);
    for (const [path, content] of Object.entries({
      ...INTENT_GAP_REVIEW_REPOSITORY.base,
      ...INTENT_GAP_REVIEW_REPOSITORY.feature,
    }))
      writeReviewStateFixtureFile(root, path, content);
    const extraction = await extractDiscovered(root);
    expect(extraction.records.length).toBe(3);
    expect(await listAdapterMismatches(root, extraction.records)).toEqual([]);
  });

  it('matches the adapter on every parsing uncertainty, indeterminate values included', async () => {
    const root = writeUncertaintyProject();
    temporaryRoots.push(root);
    const extraction = await extractDiscovered(root);
    expect(await listAdapterMismatches(root, extraction.records)).toEqual([]);
    const records = extraction.records;
    expect(
      records.some(({ references }) =>
        references.some(({ certainty }) => certainty === 'indeterminate'),
      ),
    ).toBe(true);
    expect(
      records.some(
        ({ entrySurface }) => entrySurface?.certainty === 'indeterminate',
      ),
    ).toBe(true);
    expect(
      records.some(
        ({ verification }) => verification?.cases.certainty === 'indeterminate',
      ),
    ).toBe(true);
    expect(
      records.find(({ path }) => path === 'reExport.ts')?.references,
    ).toContainEqual({
      specifier: './gone.js',
      kind: 're-export',
      resolved: { unresolved: true },
    });
    expect(
      records.find(({ path }) => path === 'cases.test.ts')?.verification,
    ).toMatchObject({
      role: 'test-record',
      cases: { certainty: 'exact', exactCount: 4 },
    });
  });
});
