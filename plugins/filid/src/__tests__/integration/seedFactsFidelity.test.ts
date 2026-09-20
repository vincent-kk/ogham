import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ecmascriptStructureAdapter,
  resolveAdapters,
} from '../../adapters/index.js';
import { readProjectFacts, resolveFactsScope } from '../../core/facts/index.js';
import { loadConfig } from '../../core/infra/configLoader/index.js';
import { toProjectRelativePath } from '../../lib/toProjectRelativePath.js';

import { seedFacts } from './helpers/seedFacts.js';
import { createPinnedReviewRepository } from './reviewFlow/helpers/createPinnedReviewRepository.js';
import { INTENT_GAP_REVIEW_REPOSITORY } from './reviewFlow/helpers/reviewFlowRepositoryFiles.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

let stateRoot: string;
let projectRoot: string;

beforeEach(async () => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-seed-fidelity-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  projectRoot = await createPinnedReviewRepository(INTENT_GAP_REVIEW_REPOSITORY);
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
});

/**
 * Every `from -> to` pair the adapter reports, read from the adapter itself.
 *
 * Deliberately not through the snapshot: once analysis reads facts, comparing
 * the snapshot with the store would compare a thing with itself and an empty
 * seeding would pass. The adapter is the independent answer here and stays
 * independent after the transition.
 *
 * @returns The pairs, as project-relative POSIX paths.
 */
async function adapterPairs(): Promise<Set<string>> {
  const scope = resolveFactsScope(loadConfig(projectRoot).config ?? undefined);
  const resolution = await resolveAdapters(projectRoot, [
    ecmascriptStructureAdapter,
  ]);
  const pairs = new Set<string>();
  for (const [filePath, ownership] of resolution.ownership) {
    const from = toProjectRelativePath(projectRoot, filePath);
    if (!scope.covers(from)) continue;
    for (const reference of await ownership.adapter.extractDependencies(
      filePath,
    ))
      if (reference.resolvedPath !== null)
        pairs.add(
          `${from} -> ${toProjectRelativePath(projectRoot, reference.resolvedPath)}`,
        );
  }
  return pairs;
}

/**
 * Every `from -> to` pair the stored records carry as an in-project edge.
 * @returns The pairs, as project-relative POSIX paths.
 */
async function storedPairs(): Promise<Set<string>> {
  const facts = await readProjectFacts(
    projectRoot,
    loadConfig(projectRoot).config ?? undefined,
  );
  const pairs = new Set<string>();
  for (const entry of facts.records.values())
    for (const reference of entry.record.facts.references)
      if ('path' in reference.resolved)
        pairs.add(`${entry.record.facts.path} -> ${reference.resolved.path}`);
  return pairs;
}

describe('what seeding a test project actually stores', () => {
  it('carries every edge the adapter reports, so seeded tests are not vacuous', async () => {
    // Seeding empty records would be worse than not seeding: every file would
    // be `exact` and every cycle, boundary violation and consumer list would
    // quietly become empty, so the tests that assert on them would pass by
    // asserting nothing. This is the guard against that regression.
    const seeded = await seedFacts(projectRoot);
    const reported = await adapterPairs();
    const stored = await storedPairs();

    expect(reported.size).toBeGreaterThan(0);
    expect(seeded.edges).toBeGreaterThan(0);
    expect([...reported].filter((pair) => !stored.has(pair))).toEqual([]);
  }, 120_000);
});
