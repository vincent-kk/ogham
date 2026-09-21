import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FACTS_DIAGNOSTIC_CODES,
  FACTS_REJECTION_CODES,
  FACTS_SUBMISSION_MAX_BYTES,
} from '../../../../constants/facts.js';
import { ToolDiagnosticError } from '../../../../mcp/errors/toolDiagnosticError.js';
import { handleFacts } from '../../../../mcp/tools/facts/index.js';
import type {
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

/**
 * Create a symbolic link, or skip the case where the platform will not.
 *
 * Windows only creates links for a privileged or developer-mode process, so the
 * cases that need one report why they did not run instead of failing there.
 *
 * @param target - Existing path the link points at.
 * @param link - Path of the link to create.
 * @param skip - Vitest context skip, called with the reason.
 */
function linkOrSkip(
  target: string,
  link: string,
  skip: (note: string) => never,
): void {
  try {
    symlinkSync(target, link);
  } catch {
    skip('symbolic links cannot be created on this platform');
  }
}

/** Bytes a hostile path would aim at: nothing from it may reach a response. */
const SECRET_BODY =
  '//registry.example.com/:_authToken=SUPERSECRETTOKENVALUE\n';

let stateRoot: string;
let project: FactsProject;

beforeEach(() => {
  stateRoot = mkdtempSync(join(tmpdir(), 'filid-facts-state-'));
  process.env.CLAUDE_CONFIG_DIR = stateRoot;
  project = createFactsProject({
    'src/index.ts': "export { thing } from './thing.js';\n",
    'src/thing.ts': 'export const thing = 1;\n',
    '.filid/config.json': JSON.stringify({
      version: '2.0',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
      facts: { covers: ['**'] },
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
 * Submit one file and return the error the boundary raised.
 * @param file Absolute path passed as the submission.
 * @returns The typed diagnostic error, so a test can read its code.
 */
async function submitExpectingRefusal(
  file: string,
): Promise<ToolDiagnosticError> {
  try {
    await handleFacts({
      action: 'submit',
      path: project.root,
      file,
      resolutionEpoch: 'sha256:0',
    });
  } catch (error) {
    if (error instanceof ToolDiagnosticError) return error;
    throw error;
  }
  throw new Error('submit accepted a file it should have refused');
}

/**
 * Read the current epoch through the dispatcher.
 * @returns The project's resolution epoch.
 */
async function currentEpoch(): Promise<string> {
  const result = await handleFacts({ action: 'status', path: project.root });
  return (result.summary as FactsStatusSummary).resolutionEpoch;
}

/**
 * Submit one file and narrow the payload to the submit variant.
 * @param file Absolute path passed as the submission.
 * @param resolutionEpoch Epoch to submit against.
 * @returns The submit summary and data.
 */
async function runSubmit(
  file: string,
  resolutionEpoch: string,
): Promise<{ summary: FactsSubmitSummary; data: FactsSubmitData | undefined }> {
  const result = await handleFacts({
    action: 'submit',
    path: project.root,
    file,
    resolutionEpoch,
  });
  return {
    summary: result.summary as FactsSubmitSummary,
    data: result.data as FactsSubmitData | undefined,
  };
}

describe('facts submit path guard', () => {
  it('refuses a relative file path', async () => {
    const error = await submitExpectingRefusal('relative/facts.json');

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_PATH_NOT_ABSOLUTE);
  });

  it('refuses a file inside the project tree', async () => {
    const inside = join(project.root, 'facts.json');
    writeFileSync(inside, '[]');

    const error = await submitExpectingRefusal(inside);

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_INSIDE_PROJECT);
  });

  it('refuses a path that reaches into the project through a symbolic link', async ({
    skip,
  }) => {
    const link = join(project.outside, 'into-project.json');
    writeFileSync(join(project.root, 'facts.json'), '[]');
    linkOrSkip(join(project.root, 'facts.json'), link, skip);

    const error = await submitExpectingRefusal(link);

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_INSIDE_PROJECT);
  });

  it('accepts a symlinked file whose target stays outside the project', async ({
    skip,
  }) => {
    const target = project.submission('real.json', '[]');
    const link = join(project.outside, 'linked.json');
    linkOrSkip(target, link, skip);

    const result = await runSubmit(link, await currentEpoch());

    expect(result.summary.epochMoved).toBe(false);
    expect(result.summary.rejectedRecords).toBe(0);
  });

  it('refuses a directory in place of a submission file', async () => {
    const directory = join(project.outside, 'a-directory');
    mkdirSync(directory);

    const error = await submitExpectingRefusal(directory);

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_NOT_REGULAR);
  });

  it.skipIf(process.platform === 'win32')(
    'refuses a FIFO instead of blocking the server on it',
    async () => {
      const fifo = join(project.outside, 'blocking.fifo');
      execFileSync('mkfifo', [fifo]);

      const error = await submitExpectingRefusal(fifo);

      expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_NOT_REGULAR);
    },
  );

  it('refuses a path the host rejects outright rather than crashing', async () => {
    const error = await submitExpectingRefusal(
      `${join(project.outside, 'facts.json')}\u0000truncated`,
    );

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_UNREADABLE);
  });

  it('accepts a path reached through a symbolic link that stays outside the project', async ({
    skip,
  }) => {
    const realDirectory = join(project.outside, 'real-output');
    mkdirSync(realDirectory);
    writeFileSync(join(realDirectory, 'facts.json'), '[]');
    const linkedDirectory = join(project.outside, 'tmp-alias');
    linkOrSkip(realDirectory, linkedDirectory, skip);

    const result = await runSubmit(
      join(linkedDirectory, 'facts.json'),
      await currentEpoch(),
    );

    expect(result.summary.epochMoved).toBe(false);
    expect(result.summary.rejectedRecords).toBe(0);
  });

  it('refuses a file over the byte cap and names the cap, not the contents', async () => {
    const oversized = project.submission('big.json', '');
    writeFileSync(
      oversized,
      Buffer.alloc(FACTS_SUBMISSION_MAX_BYTES + 1, 0x20),
    );

    const error = await submitExpectingRefusal(oversized);

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_TOO_LARGE);
    expect(error.message).toContain(String(FACTS_SUBMISSION_MAX_BYTES));
  });

  it('leaks no byte of a non-JSON file into the error it returns', async () => {
    const credentials = project.submission('.npmrc-copy', SECRET_BODY);

    const error = await submitExpectingRefusal(credentials);

    expect(error.code).toBe(FACTS_DIAGNOSTIC_CODES.FILE_NOT_JSON);
    const serialized = JSON.stringify({
      message: error.message,
      nextAction: error.nextAction,
      code: error.code,
    });
    expect(serialized).not.toContain('SUPERSECRETTOKENVALUE');
    expect(serialized).not.toContain('_authToken');
  });

  it('leaks no field of an off-schema JSON file into the response', async () => {
    const file = project.submission(
      'not-facts.json',
      JSON.stringify([{ path: SECRET_BODY, token: 'SUPERSECRETTOKENVALUE' }]),
    );
    const result = await runSubmit(file, await currentEpoch());

    const serialized = JSON.stringify(result);
    expect(serialized).toContain(FACTS_REJECTION_CODES.SCHEMA_INVALID);
    expect(serialized).not.toContain('SUPERSECRETTOKENVALUE');
    expect(serialized).not.toContain('_authToken');
  });
});

/**
 * Create a config file reachable both directly and through a linked directory.
 * @param body Contents of the config file.
 * @param skip Vitest context skip, used when links are unavailable.
 * @returns The real path, the linked spelling and the digest of the contents.
 */
function declaredInputThroughLink(
  body: string,
  skip: (note: string) => never,
): {
  realPath: string;
  linkedPath: string;
  hash: string;
} {
  const realDirectory = join(project.outside, 'config-dir');
  mkdirSync(realDirectory);
  const realPath = join(realDirectory, 'tsconfig.json');
  writeFileSync(realPath, body);
  const linked = join(project.outside, 'config-alias');
  linkOrSkip(realDirectory, linked, skip);
  return {
    realPath,
    linkedPath: join(linked, 'tsconfig.json'),
    hash: `sha256:${createHash('sha256').update(readFileSync(realPath)).digest('hex')}`,
  };
}

/**
 * A record for `src/thing.ts` declaring one resolution input.
 * @param path Declared input path.
 * @param contentHash Digest the record claims for it.
 * @returns The record to submit.
 */
function recordDeclaring(path: string, contentHash: string) {
  return project.facts('src/thing.ts', {
    provenance: {
      tool: 'test-extractor',
      version: '1.0.0',
      command: 'test',
      tier: 'tool',
      resolutionInputs: [{ path, contentHash }],
    },
  });
}

describe('facts record path guard', () => {
  it('refuses a record for a symlinked path that leads outside the project', async ({
    skip,
  }) => {
    const secret = join(project.outside, 'secret.txt');
    writeFileSync(secret, 'OUTSIDE-MARKER-VALUE\n');
    linkOrSkip(secret, join(project.root, 'src', 'link.ts'), skip);
    const epoch = await currentEpoch();
    const escaping = {
      ...project.facts('src/thing.ts'),
      path: 'src/link.ts',
      contentHash: `sha256:${createHash('sha256').update(readFileSync(secret)).digest('hex')}`,
    };
    const file = project.submission('link.json', JSON.stringify([escaping]));

    const result = await runSubmit(file, epoch);

    expect(result.summary.accepted).toBe(0);
    expect(result.data?.rejected[0]?.code).toBe(
      FACTS_REJECTION_CODES.PATH_INVALID,
    );
    expect(JSON.stringify(result)).not.toContain('OUTSIDE-MARKER-VALUE');
  });

  it('hashes a declared resolution input reached through a symbolic link', async ({
    skip,
  }) => {
    const declared = declaredInputThroughLink('{}', skip);
    const epoch = await currentEpoch();
    const file = project.submission(
      'linked-input.json',
      JSON.stringify([recordDeclaring(declared.linkedPath, declared.hash)]),
    );

    const result = await runSubmit(file, epoch);

    expect(result.summary.accepted).toBe(1);
    expect(result.summary.rejectedClaims).toBe(0);
  });

  it('turns the declaring record stale when that link target changes', async ({
    skip,
  }) => {
    const declared = declaredInputThroughLink('{}', skip);
    const epoch = await currentEpoch();
    await runSubmit(
      project.submission(
        'linked-input.json',
        JSON.stringify([recordDeclaring(declared.linkedPath, declared.hash)]),
      ),
      epoch,
    );
    writeFileSync(declared.realPath, '{"compilerOptions":{}}');

    const result = await runSubmit(
      project.submission(
        'linked-input-2.json',
        JSON.stringify([recordDeclaring(declared.linkedPath, declared.hash)]),
      ),
      epoch,
    );

    expect(result.summary.accepted).toBe(0);
    expect(result.data?.rejected[0]?.code).toBe(
      FACTS_REJECTION_CODES.RESOLUTION_INPUT_STALE,
    );
  });

  it.skipIf(process.platform === 'win32')(
    'refuses a record declaring a FIFO as a resolution input',
    async () => {
      const fifo = join(project.outside, 'input.fifo');
      execFileSync('mkfifo', [fifo]);
      const epoch = await currentEpoch();
      const record = project.facts('src/thing.ts', {
        provenance: {
          tool: 'test-extractor',
          version: '1.0.0',
          command: 'test',
          tier: 'tool',
          resolutionInputs: [
            { path: fifo, contentHash: `sha256:${'0'.repeat(64)}` },
          ],
        },
      });
      const file = project.submission(
        'fifo-input.json',
        JSON.stringify([record]),
      );

      const result = await runSubmit(file, epoch);

      expect(result.summary.accepted).toBe(0);
      expect(result.data?.rejected[0]?.code).toBe(
        FACTS_REJECTION_CODES.RESOLUTION_INPUT_UNREADABLE,
      );
    },
  );

  it('refuses a record whose path climbs out of the project', async () => {
    const epoch = await currentEpoch();
    const escaping = {
      ...project.facts('src/thing.ts'),
      path: '../outside/secret.ts',
    };
    const file = project.submission('escape.json', JSON.stringify([escaping]));

    const result = await runSubmit(file, epoch);

    expect(result.summary.accepted).toBe(0);
    expect(result.data?.rejected[0]?.code).toBe(
      FACTS_REJECTION_CODES.PATH_INVALID,
    );
  });

  it('refuses a resolved path that leaves the project through a symbolic link', async () => {
    const outsideTarget = join(project.outside, 'target.ts');
    writeFileSync(outsideTarget, 'export const x = 1;\n');
    symlinkSync(project.outside, join(project.root, 'src', 'linked'));
    const epoch = await currentEpoch();
    const record = project.facts('src/index.ts', {
      references: [
        {
          specifier: './thing.js',
          kind: 'static',
          resolved: { path: 'src/linked/target.ts' },
        },
      ],
    });
    const file = project.submission('link.json', JSON.stringify([record]));

    const result = await runSubmit(file, epoch);

    expect(result.data?.rejected[0]?.code).toBe(
      FACTS_REJECTION_CODES.RESOLVED_PATH_INVALID,
    );
  });
});
