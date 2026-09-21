import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { extractFileFacts } from '../../../factsExtractor/index.js';
import { resolveFactsScope } from '../../../core/facts/index.js';
import { loadConfig } from '../../../core/infra/configLoader/index.js';
import {
  listScannedFilePaths,
  scanFileSetOptions,
} from '../../../core/tree/fractalTree/index.js';
import { handleFacts } from '../../../mcp/tools/facts/index.js';
import type {
  FactsStatusSummary,
  FactsSubmitData,
  FactsSubmitSummary,
} from '../../../mcp/tools/facts/index.js';

/** What seeding a test project stored, so a test can assert on it. */
export interface SeededFacts {
  resolutionEpoch: string;
  accepted: number;
  /** How many in-project edges the seeded records carry. */
  edges: number;
}

/**
 * Give a test project a complete set of valid facts, extracted from its files.
 *
 * The records come from the extraction program, in process, so a seeded project
 * carries the edges its source really makes. Seeding empty records instead
 * would be worse than not seeding at all: every file would be `exact` and every
 * cycle, boundary violation and consumer list would quietly become empty, and
 * the tests that assert on them would pass by asserting nothing.
 *
 * Only the files the scope covers are extracted, which is what the extraction
 * list `status` writes does in production: submitting a record for a file the
 * scope excludes is refused, and a seeding helper that ignored the scope would
 * be reporting that refusal instead of seeding.
 *
 * Submission goes through the tool rather than straight to the store, so the
 * path guard, the epoch check and every §4 check run exactly as they do in
 * production — a harness that wrote records directly would keep passing after
 * those gates broke. The intermediate file is written outside the project, and
 * under the canonicalized temp directory, because the guard refuses both a path
 * inside the tree and one whose components include a symbolic link.
 *
 * A refused record throws here rather than travelling. Seeding that half
 * worked leaves the project `indeterminate`, and that shows up as a puzzling
 * assertion failure far from the fixture that caused it; the refusal carries
 * its code and path, so failing at the seam names the cause.
 *
 * @param projectRoot - Absolute root of the project to seed. Its scope is
 * whatever `facts.covers` declares, or the adapters' default extensions when it
 * declares none.
 * @returns The epoch the facts were stored at, how many records landed, and how
 * many in-project edges they carry.
 * @throws When the submission refused a record or one of its claims.
 */
export async function seedFacts(projectRoot: string): Promise<SeededFacts> {
  const status = await handleFacts({ action: 'status', path: projectRoot });
  const resolutionEpoch = (status.summary as FactsStatusSummary)
    .resolutionEpoch;
  const config = loadConfig(projectRoot).config ?? undefined;
  const scope = resolveFactsScope(config);
  const scanned = (
    await listScannedFilePaths(projectRoot, scanFileSetOptions(config))
  ).filter((path) => scope.covers(path));
  const extraction = await extractFileFacts(projectRoot, scanned, 'seedFacts');
  const directory = mkdtempSync(join(realpathSync(tmpdir()), 'filid-seed-'));
  const file = join(directory, 'facts.json');
  writeFileSync(file, JSON.stringify(extraction.records));
  try {
    const result = await handleFacts({
      action: 'submit',
      path: projectRoot,
      file,
      resolutionEpoch,
    });
    const rejected = (result.data as FactsSubmitData).rejected;
    if (rejected.length > 0)
      throw new Error(
        `seedFacts: ${projectRoot} refused ${rejected.length} claim(s): ${rejected
          .map((one) => `${one.path} ${one.code}`)
          .join(', ')}`,
      );
    return {
      resolutionEpoch,
      accepted: (result.summary as FactsSubmitSummary).accepted,
      edges: extraction.records.reduce(
        (total, record) =>
          total +
          record.references.filter((reference) => 'path' in reference.resolved)
            .length,
        0,
      ),
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
