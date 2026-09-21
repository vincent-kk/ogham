import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FACTS_REJECTION_CODES,
  FACTS_SOURCE_FILE_MAX_BYTES,
} from '../../../../constants/facts.js';
import { hashProjectFile } from '../../../../core/facts/index.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
  FactsStatusData,
  FactsStatusSummary,
  FactsSubmitData,
  FactsSubmitSummary,
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

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-source-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/thing.ts': 'export const thing = 1;\n',
    '.filid/config.json': CONFIG,
  });
});

afterEach(() => {
  if (ORIGINAL_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR;
  else process.env.CLAUDE_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
  rmSync(stateRoot, { recursive: true, force: true });
  cleanupFactsProjects();
});

describe('hashProjectFile guard', () => {
  it('reads a regular project file', () => {
    const result = hashProjectFile(project.root, 'src/thing.ts');

    expect(result.ok).toBe(true);
  });

  // mkfifo is POSIX-only; Windows has no FIFO to swap in at a source path.
  it.skipIf(process.platform === 'win32')(
    'refuses a FIFO swapped in at a source path instead of blocking on it',
    () => {
      execFileSync('mkfifo', [join(project.root, 'src', 'swapped.ts')]);

      const result = hashProjectFile(project.root, 'src/swapped.ts');

      expect(result).toEqual({ ok: false, reason: 'unreadable' });
    },
  );

  it('refuses a source path whose link leads outside the project', ({
    skip,
  }) => {
    const outside = join(project.outside, 'secret.txt');
    writeFileSync(outside, 'OUTSIDE-MARKER-VALUE\n');
    try {
      symlinkSync(outside, join(project.root, 'src', 'escape.ts'));
    } catch {
      skip('symbolic links cannot be created on this platform');
    }

    const result = hashProjectFile(project.root, 'src/escape.ts');

    expect(result).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('refuses a path that climbs out of the project', () => {
    const result = hashProjectFile(project.root, '../outside/secret.txt');

    expect(result).toEqual({ ok: false, reason: 'unreadable' });
  });
});

describe('a source file filid will not read', () => {
  it('is refused with an action that is not "re-extract"', async () => {
    project.write(
      'src/huge.ts',
      `// ${'x'.repeat(FACTS_SOURCE_FILE_MAX_BYTES)}\n`,
    );
    const statusBefore = await handleFacts({
      action: 'status',
      path: project.root,
    });
    const file = project.submission(
      'huge.json',
      JSON.stringify([project.facts('src/thing.ts')]),
    );

    const result = await handleFacts({
      action: 'submit',
      path: project.root,
      file,
      resolutionEpoch: (statusBefore.summary as FactsStatusSummary)
        .resolutionEpoch,
    });

    // The record submitted is for a readable file, so the batch lands; the
    // oversized file is simply one filid holds no facts for.
    expect((result.summary as FactsSubmitSummary).accepted).toBe(1);
    const after = await handleFacts({ action: 'status', path: project.root });
    expect((after.data as FactsStatusData).missing.paths).toContain(
      'src/huge.ts',
    );
  }, 30000);

  it('rejects a record for it with facts-source-file-unreadable', async () => {
    project.write(
      'src/huge.ts',
      `// ${'x'.repeat(FACTS_SOURCE_FILE_MAX_BYTES)}\n`,
    );
    const statusBefore = await handleFacts({
      action: 'status',
      path: project.root,
    });
    const record = {
      ...project.facts('src/thing.ts'),
      path: 'src/huge.ts',
    };
    const file = project.submission('huge.json', JSON.stringify([record]));

    const result = await handleFacts({
      action: 'submit',
      path: project.root,
      file,
      resolutionEpoch: (statusBefore.summary as FactsStatusSummary)
        .resolutionEpoch,
    });

    const rejection = (result.data as FactsSubmitData).rejected[0];
    expect(rejection?.code).toBe(FACTS_REJECTION_CODES.SOURCE_UNREADABLE);
    expect(rejection?.nextAction).toContain('facts.excludes');
    expect(rejection?.nextAction).not.toMatch(/re-extract this file and submit/);
  }, 30000);
});
