import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_SUBMISSION_MAX_BYTES,
} from '../../../../constants/facts.js';
import { ToolDiagnosticError } from '../../../../mcp/errors/toolDiagnosticError.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';

import {
  cleanupFactsProjects,
  createFactsProject,
} from './helpers/createFactsProject.js';
import type { FactsProject } from './helpers/createFactsProject.js';

const ORIGINAL_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;

/** Bytes a hostile path would aim at: nothing from it may reach a response. */
const SECRET_BODY = '//registry.example.com/:_authToken=SUPERSECRETTOKENVALUE\n';

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-cmp-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/thing.ts': 'export const thing = 1;\n',
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
 * Compare one candidate file and return the refusal it raised.
 *
 * `compare` opens a caller-chosen path exactly as `submit` does. The guard is
 * one shared function, but each entry point gets its own scenarios: a future
 * change could route one of them around the guard, and only a test on that
 * path would notice.
 *
 * @param file - Absolute path passed as the candidate.
 * @returns The typed diagnostic error, so a test can read its code.
 */
async function compareExpectingRefusal(
  file: string,
): Promise<ToolDiagnosticError> {
  try {
    await handleFacts({ action: 'compare', path: project.root, file });
  } catch (error) {
    if (error instanceof ToolDiagnosticError) return error;
    throw error;
  }
  throw new Error('compare accepted a file it should have refused');
}

describe('facts compare candidate path guard', () => {
  it('refuses a candidate inside the project tree', async () => {
    const inside = join(project.root, 'candidate.json');
    writeFileSync(inside, '[]');

    const error = await compareExpectingRefusal(inside);

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_INSIDE_PROJECT);
  });

  it('refuses a candidate whose link leads back into the project', async ({
    skip,
  }) => {
    writeFileSync(join(project.root, 'candidate.json'), '[]');
    const link = join(project.outside, 'into-project.json');
    try {
      symlinkSync(join(project.root, 'candidate.json'), link);
    } catch {
      skip('symbolic links cannot be created on this platform');
    }

    const error = await compareExpectingRefusal(link);

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_INSIDE_PROJECT);
  });

  it('accepts a candidate reached through a link that stays outside', async ({
    skip,
  }) => {
    const real = join(project.outside, 'real-dir');
    mkdirSync(real);
    writeFileSync(join(real, 'candidate.json'), '[]');
    const linked = join(project.outside, 'alias-dir');
    try {
      symlinkSync(real, linked);
    } catch {
      skip('symbolic links cannot be created on this platform');
    }

    const result = await handleFacts({
      action: 'compare',
      path: project.root,
      file: join(linked, 'candidate.json'),
    });

    expect(result.diagnostics).toEqual([]);
  });

  // mkfifo is POSIX-only; Windows has no FIFO for this guard to refuse.
  it.skipIf(process.platform === 'win32')(
    'refuses a FIFO instead of blocking the server on it',
    async () => {
      const fifo = join(project.outside, 'candidate.fifo');
      execFileSync('mkfifo', [fifo]);

      const error = await compareExpectingRefusal(fifo);

      expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_NOT_REGULAR);
    },
  );

  it('refuses a candidate over the byte cap', async () => {
    const oversized = project.submission('big.json', '');
    writeFileSync(oversized, Buffer.alloc(FACTS_SUBMISSION_MAX_BYTES + 1, 0x20));

    const error = await compareExpectingRefusal(oversized);

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_TOO_LARGE);
  });

  it('leaks no byte of a non-JSON candidate into the refusal', async () => {
    const credentials = project.submission('.npmrc-copy', SECRET_BODY);

    const error = await compareExpectingRefusal(credentials);

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_NOT_JSON);
    expect(
      JSON.stringify({ message: error.message, next: error.nextAction }),
    ).not.toContain('SUPERSECRETTOKENVALUE');
  });
});
