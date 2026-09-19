import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FACTS_SCHEMA_VERSION } from '../../../constants/facts.js';
import { hashProjectFile } from '../../../core/facts/index.js';
import type { FileFacts } from '../../../core/facts/index.js';
import { loadConfig } from '../../../core/infra/configLoader/index.js';
import {
  listScannedFilePaths,
  scanFileSetOptions,
} from '../../../core/tree/fractalTree/index.js';
import { handleFacts } from '../../../mcp/tools/facts/index.js';
import type {
  FactsStatusSummary,
  FactsSubmitSummary,
} from '../../../mcp/tools/facts/index.js';

/** What seeding a test project stored, so a test can assert on it. */
export interface SeededFacts {
  resolutionEpoch: string;
  accepted: number;
}

/**
 * Give a test project a complete set of valid facts.
 *
 * Records carry no references. That is a real provider claim, not a placeholder:
 * a provider reports a record for every file in its scope and an empty array
 * where it found no reference, so a project seeded this way is `exact`
 * everywhere and any later test that needs an edge adds it explicitly.
 *
 * Submission goes through the tool rather than straight to the store, so the
 * path guard, the epoch check and every §4 check run exactly as they do in
 * production — a harness that wrote records directly would keep passing after
 * those gates broke. The intermediate file is written outside the project, and
 * under the canonicalized temp directory, because the guard refuses both a path
 * inside the tree and one whose components include a symbolic link.
 *
 * No adapter is involved: turning adapter output into records is the extraction
 * program's job, and product code has no adapter-to-facts path.
 *
 * @param projectRoot - Absolute root of a project whose config declares
 * `facts.covers`; without it every record is out of scope.
 * @returns The epoch the facts were stored at, and how many records landed.
 */
export async function seedFacts(projectRoot: string): Promise<SeededFacts> {
  const status = await handleFacts({ action: 'status', path: projectRoot });
  const resolutionEpoch = (status.summary as FactsStatusSummary)
    .resolutionEpoch;
  const scanned = await listScannedFilePaths(
    projectRoot,
    scanFileSetOptions(loadConfig(projectRoot).config ?? undefined),
  );
  const records = scanned.flatMap(
    (path): FileFacts[] => {
      const digest = hashProjectFile(projectRoot, path);
      if (!digest.ok) return [];
      return [
        {
          schemaVersion: FACTS_SCHEMA_VERSION,
          path,
          contentHash: digest.contentHash,
          references: [],
          provenance: {
            tool: 'seed-facts',
            version: '1.0.0',
            command: 'seedFacts',
            tier: 'tool',
            resolutionInputs: [],
          },
        },
      ];
    },
  );
  const directory = mkdtempSync(join(realpathSync(tmpdir()), 'filid-seed-'));
  const file = join(directory, 'facts.json');
  writeFileSync(file, JSON.stringify(records));
  try {
    const result = await handleFacts({
      action: 'submit',
      path: projectRoot,
      file,
      resolutionEpoch,
    });
    return {
      resolutionEpoch,
      accepted: (result.summary as FactsSubmitSummary).accepted,
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
