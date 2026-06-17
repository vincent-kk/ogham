import { mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import {
  AGY_HOME,
  AGY_LAST_CONVERSATIONS_PATH,
  CENNAD_HOME,
  agyTranscriptPath,
  antigravityCwdPath,
} from '../../../constants/paths.js';
import type {
  AntigravityFlags,
  DispatchOptions,
} from '../../../types/index.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../__tests__/fakeBinary.js';
import { antigravityDispatcher } from '../index.js';

const FLAGS: AntigravityFlags = { sandbox: false, skip_permissions: false };

const FAKE_SCRIPT = `#!/usr/bin/env node
const args = process.argv.slice(2);
const mode = process.env.CENNAD_FAKE_AGY_MODE || 'success';

if (args[0] === 'models') {
  process.stdout.write('Gemini 3.1 Pro\\nClaude Sonnet 4.5\\n');
  process.exit(0);
}

const allowed = new Set(['-p', '--print', '--continue', '-c', '--sandbox', '--dangerously-skip-permissions']);
for (const a of args) {
  if (a.startsWith('-') && !a.startsWith('--model=') && !allowed.has(a)) {
    process.stderr.write('flags provided but not defined: ' + a + '\\n');
    process.exit(2);
  }
}

if (mode === 'success') {
  process.stdout.write('fake antigravity response\\n');
  process.exit(0);
} else if (mode === 'empty-stdout') {
  process.exit(0);
} else if (mode === 'auth-stderr') {
  process.stderr.write('Please sign in to continue\\n');
  process.exit(1);
} else if (mode === 'rate-limit-stderr') {
  process.stderr.write('HTTP 429 Too Many Requests\\n');
  process.exit(1);
} else {
  process.stderr.write('boom\\n');
  process.exit(1);
}
`;

let handle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;

beforeAll(() => {
  handle = installFakeBinary('agy', FAKE_SCRIPT);
  restorePath = prependToPath(handle.dir);
});

afterAll(async () => {
  restorePath();
  handle.cleanup();
  await rm(CENNAD_HOME, { recursive: true, force: true });
});

beforeEach(async () => {
  delete process.env.CENNAD_FAKE_AGY_MODE;
  await rm(CENNAD_HOME, { recursive: true, force: true });
  await rm(AGY_HOME, { recursive: true, force: true });
});

function baseOptions(): DispatchOptions<AntigravityFlags> {
  return {
    prompt: 'hello',
    tier: 'mid',
    options: {},
    sessionId: 'agy-session',
    cwd: process.cwd(),
    flags: FLAGS,
    spawnTimeoutMs: 10000,
  };
}

describe('antigravityDispatcher.start', () => {
  it('returns success, parses the json response, and reports the isolated cwd as ref', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'success';
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('success');
    expect(result.error).toBeNull();
    expect(result.response).toBe('fake antigravity response');
    expect(result.externalSessionRef).toContain('antigravity-cwd');
  });

  it('fails with cli_error on empty stdout (Issue #76, no transcript recoverable)', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'empty-stdout';
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cli_error');
  });

  it('recovers from the agy transcript when stdout is empty (#76 fallback)', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'empty-stdout';
    const cwd = antigravityCwdPath('agy-session');
    const convId = 'recovered-conv';
    await mkdir(dirname(AGY_LAST_CONVERSATIONS_PATH), { recursive: true });
    await writeFile(
      AGY_LAST_CONVERSATIONS_PATH,
      JSON.stringify({ [cwd]: convId }),
    );
    const transcript = agyTranscriptPath(convId);
    await mkdir(dirname(transcript), { recursive: true });
    await writeFile(
      transcript,
      JSON.stringify({
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        content: 'disk answer',
      }),
    );
    const future = new Date(Date.now() + 60_000);
    await utimes(transcript, future, future);

    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('success');
    expect(result.response).toBe('disk answer');
  });

  it('maps OAuth sign-in stderr to an auth failure', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'auth-stderr';
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.error?.code).toBe('auth');
  });

  it('maps HTTP 429 stderr to a rate_limit failure', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'rate-limit-stderr';
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.error?.code).toBe('rate_limit');
  });

  it('passes --model=<name> for a concrete tier without it being rejected', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'success';
    const result = await antigravityDispatcher.start({
      ...baseOptions(),
      tier: 'high',
      modelMap: { high: 'Gemini 3.1 Pro', mid: 'x', low: 'y' },
    });
    expect(result.status).toBe('success');
    expect(result.resolvedModel).toBe('Gemini 3.1 Pro');
  });
});

describe('antigravityDispatcher.resume', () => {
  it('preserves the stored externalSessionRef on success', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'success';
    const result = await antigravityDispatcher.resume({
      ...baseOptions(),
      externalSessionRef: '/stored/cwd',
    });
    expect(result.status).toBe('success');
    expect(result.externalSessionRef).toBe('/stored/cwd');
  });
});

describe('antigravityDispatcher cli-missing', () => {
  let savedPath: string | undefined;

  beforeEach(() => {
    savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
  });

  afterEach(() => {
    process.env.PATH = savedPath;
  });

  it('returns cli_error when agy is not on PATH', async () => {
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cli_error');
  });
});
