import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FACTS_REJECTION_CODES } from '../../../../constants/facts.js';
import {
  readFactsStore,
  resolveFactsStorePaths,
} from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsStatusSummary,
  FactsSubmitData,
} from '../../../../mcp/tools/facts/index.js';

import {
  cleanupFactsProjects,
  createFactsProject,
} from './helpers/createFactsProject.js';
import type { FactsProject } from './helpers/createFactsProject.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

const CONFIG = JSON.stringify({
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
  facts: { covers: ['src/**'] },
});

/** A spec file that marks exactly one acceptance group. */
const SPEC_BODY = [
  '// filid:contract AC-marked',
  "import { it } from 'vitest';",
  "it('works', () => {});",
  '',
].join('\n');

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-groups-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/feature.spec.ts': SPEC_BODY,
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
 * Submit one record claiming the given contract groups.
 * @param contractGroupIds What the record says the spec declares.
 * @returns The rejections and the group ids the store kept.
 */
async function submitGroups(contractGroupIds: string[]): Promise<{
  rejected: FactsSubmitData['rejected'];
  stored: string[] | undefined;
}> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const file = project.submission(
    'record.json',
    JSON.stringify([
      project.facts('src/feature.spec.ts', {
        verification: {
          role: 'spec-document',
          cases: { certainty: 'exact', exactCount: 1, knownLowerBound: 1, reasons: [] },
          contractGroupIds,
        },
      }),
    ]),
  );
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
  const storePaths = resolveFactsStorePaths(project.root);
  const record = [
    ...readFactsStore(storePaths.directory).records.values(),
  ].find((one) => one.facts.path === 'src/feature.spec.ts');
  return {
    rejected: (result.data as FactsSubmitData).rejected,
    stored: record?.facts.verification?.contractGroupIds,
  };
}

describe('a record’s contract group ids are checked against the bytes', () => {
  it('refuses an id the marker grammar cannot produce, before reading a line', async () => {
    const result = await submitGroups(['AC marked']);

    // A space cannot appear in a marker, so no line can carry this id. The
    // schema says so rather than letting the line scan report it absent.
    expect(result.rejected).toContainEqual(
      expect.objectContaining({ code: FACTS_REJECTION_CODES.SCHEMA_INVALID }),
    );
    expect(result.stored).toBeUndefined();
  });

  it('refuses an id longer than a marker is allowed to carry', async () => {
    const result = await submitGroups([`AC-${'x'.repeat(200)}`]);

    expect(result.rejected).toContainEqual(
      expect.objectContaining({ code: FACTS_REJECTION_CODES.SCHEMA_INVALID }),
    );
  });

  it('stores a group the file marks', async () => {
    const result = await submitGroups(['AC-marked']);

    expect(result.rejected).toEqual([]);
    expect(result.stored).toEqual(['AC-marked']);
  });

  it('rejects a group no marker in the file names, and stores the rest', async () => {
    const result = await submitGroups(['AC-marked', 'AC-invented']);

    expect(result.rejected).toContainEqual(
      expect.objectContaining({
        path: 'src/feature.spec.ts',
        code: FACTS_REJECTION_CODES.CONTRACT_GROUP_ABSENT,
      }),
    );
    expect(result.stored).toEqual(['AC-marked']);
  });

  it('rejects a group whose id sits on a line no marker introduces', async () => {
    project.write(
      'src/feature.spec.ts',
      `const note = 'AC-invented';\n${SPEC_BODY}`,
    );

    const result = await submitGroups(['AC-invented']);

    // The id is in the bytes, so counting the id alone would accept it. What
    // the record claims is a marker, and the marker is what the count is over.
    expect(result.rejected).toContainEqual(
      expect.objectContaining({
        code: FACTS_REJECTION_CODES.CONTRACT_GROUP_ABSENT,
      }),
    );
  });
});
