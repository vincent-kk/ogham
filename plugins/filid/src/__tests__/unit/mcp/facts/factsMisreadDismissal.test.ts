import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { FactsReference } from '../../../../core/facts/index.js';
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

const CONFIG = JSON.stringify({
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
  facts: { covers: ['src/**'] },
});

/** The specifier only a comment holds, which a provider reported as an edge. */
const MISREAD = './thing.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

let stateRoot: string;
let project: FactsProject;

beforeEach(async () => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-misread-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': `// export { thing } from '${MISREAD}';\nexport const index = 1;\n`,
    'src/thing.ts': 'export const thing = 1;\n',
    '.filid/config.json': CONFIG,
  });
  await submit('claimed.json', [
    { specifier: MISREAD, kind: 'static', resolved: { path: 'src/thing.ts' } },
  ]);
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
  cleanupFactsProjects();
});

/**
 * Replace `src/index.ts`'s record with one holding exactly these references.
 * @param name Submission file name.
 * @param references References the new record claims.
 * @returns Nothing; the store holds that record afterwards.
 */
async function submit(
  name: string,
  references: FactsReference[],
): Promise<void> {
  const status = await handleFacts({ action: 'status', path: project.root });
  const file = project.submission(
    name,
    JSON.stringify([project.facts('src/index.ts', { references })]),
  );
  await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch: (status.summary as FactsStatusSummary).resolutionEpoch,
  });
}

/**
 * Every open item the project holds, as `facts status` reports them.
 * @returns The `unadjudicated` items of the current status.
 */
async function openItems() {
  const result = await handleFacts({ action: 'status', path: project.root });
  return (result.data as FactsStatusData).unadjudicated.items;
}

describe('a reference only a comment holds is settled from the status response', () => {
  it('returns it as a coverage-shrank item carrying every value adjudicate needs', async () => {
    await submit('corrected.json', []);

    const [item] = await openItems();

    // This is the P5 claim of the restructure misread finding: its next action
    // names the path and the specifier, and everything else the `adjudicate`
    // call takes comes back on the item for that path.
    expect(item).toMatchObject({
      path: 'src/index.ts',
      kind: 'static',
      reference: MISREAD,
      resolvedPath: 'src/thing.ts',
      origin: 'coverage-shrank',
    });
    expect(item?.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(item?.lines).toEqual([1]);
  });

  it('settles the file once two actors dismiss it from those values alone', async () => {
    await submit('corrected.json', []);
    const [item] = await openItems();

    for (const actor of ['first-reader', 'second-reader'])
      await handleFacts({
        action: 'adjudicate',
        path: project.root,
        sourcePath: item!.path,
        contentHash: item!.contentHash,
        actor,
        items: [
          {
            kind: item!.kind,
            reference: item!.reference,
            resolvedPath: item!.resolvedPath,
            decision: 'dismiss',
            reason: 'The specifier sits inside a comment.',
          },
        ],
      });

    const status = await handleFacts({ action: 'status', path: project.root });
    expect(await openItems()).toEqual([]);
    expect((status.data as FactsStatusData).uncertain.paths).not.toContain(
      'src/index.ts',
    );
  });
});
