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
  installFakeBinary,
  prependToPath,
} from '../../../__tests__/fixtures/fakeBinary.js';
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
import { antigravityDispatcher } from '../index.js';

const FLAGS: AntigravityFlags = { sandbox: false, skip_permissions: false };

const FAKE_SCRIPT = `#!/usr/bin/env node
const args = process.argv.slice(2);
const mode = process.env.CENNAD_FAKE_AGY_MODE || 'success';

if (args[0] === 'models') {
  process.stdout.write('Gemini 3.1 Pro\\nClaude Sonnet 4.5\\n');
  process.exit(0);
}

const allowed = new Set(['-p', '--print', '--continue', '-c', '--sandbox', '--dangerously-skip-permissions', '--output-format', '--print-timeout']);
// A build old enough to need the plain-text parser never learned these flags, and
// agy's own arg check exits before running. Modelling it any other way describes a
// build that does not exist.
const modern = new Set(['--output-format', '--print-timeout']);
for (const a of args) {
  if (mode === 'no-stream-json' && modern.has(a)) {
    process.stderr.write('flags provided but not defined: ' + a + '\\n');
    process.exit(2);
  }
  if (a.startsWith('-') && !a.startsWith('--model=') && !allowed.has(a)) {
    process.stderr.write('flags provided but not defined: ' + a + '\\n');
    process.exit(2);
  }
}

if (mode === 'success') {
  process.stdout.write(JSON.stringify({ event: 'step_update', step_update: { step_index: 0, state: 'DONE' } }) + '\\n');
  process.stdout.write(JSON.stringify({ event: 'result', result: { conversation_id: '11111111-2222-4333-8444-555555555555', status: 'SUCCESS', response: 'fake antigravity response\\n' } }) + '\\n');
  process.exit(0);
} else if (mode === 'error-exit-zero') {
  process.stdout.write(JSON.stringify({ event: 'result', result: { status: 'ERROR', error: 'invalid model selection' } }) + '\\n');
  process.exit(0);
} else if (mode === 'hang') {
  process.stdout.write(JSON.stringify({ event: 'step_update', step_update: { step_index: 0, state: 'RUNNING' } }) + '\\n');
  setInterval(() => {}, 1000);
} else if (mode === 'empty-stdout') {
  process.exit(0);
} else if (mode === 'empty-stdout-stderr') {
  process.stderr.write('a tool required the "command" permission that headless mode cannot prompt for, so it was auto-denied. re-run with --dangerously-skip-permissions.\\n');
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

// agy가 antigravity-cwd/<sessionId>를 cwd로 쥐고 있어, Windows에서는 프로세스가
// 완전히 사라질 때까지 그 핸들이 남아 teardown의 rm이 EPERM으로 튄다. 재시도가 그
// 창을 넘긴다 — 프로덕션 cleanupCwdOnTimeout과 같은 정책.
const RM_OPTIONS = {
  recursive: true,
  force: true,
  maxRetries: 3,
  retryDelay: 100,
} as const;

let handle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;

beforeAll(() => {
  handle = installFakeBinary('agy', FAKE_SCRIPT);
  restorePath = prependToPath(handle.dir);
});

afterAll(async () => {
  restorePath();
  handle.cleanup();
  await rm(CENNAD_HOME, RM_OPTIONS);
});

beforeEach(async () => {
  delete process.env.CENNAD_FAKE_AGY_MODE;
  await rm(CENNAD_HOME, RM_OPTIONS);
  await rm(AGY_HOME, RM_OPTIONS);
});

function baseOptions(): DispatchOptions<AntigravityFlags> {
  return {
    prompt: 'hello',
    tier: 'mid',
    options: {},
    sessionId: 'agy-session',
    cwd: process.cwd(),
    flags: FLAGS,
    idleTimeoutMs: 5000,
    hardCapMs: 10000,
  };
}

describe('antigravityDispatcher.start', () => {
  // A stopped agy leaves a truncated stream. The transcript fallback that
  // rescues an empty stdout must not run here — it would return the PREVIOUS
  // turn's answer as this turn's success.
  it('returns cancelled when the caller aborts a running CLI', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'hang';
    const caller = new AbortController();
    setTimeout(() => caller.abort(), 200);

    const result = await antigravityDispatcher.start({
      ...baseOptions(),
      idleTimeoutMs: 3000,
      hardCapMs: 3000,
      signal: caller.signal,
    });

    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cancelled');
    expect(result.response).toBeNull();
  });

  it('returns success, parses the streamed result event, and records the conversation id as ref', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'success';
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('success');
    expect(result.error).toBeNull();
    expect(result.response).toBe('fake antigravity response');
    expect(result.externalSessionRef).toBe(
      '11111111-2222-4333-8444-555555555555',
    );
  });

  // start and resume always send --output-format and --print-timeout, so an agy that
  // does not know them exits on the arg check and never reaches a parser. The
  // plain-text branch in parseJsonOutput is tolerance for an unexpected shape (its
  // own spec covers it), not support for an older build — this pins which of the two
  // the dispatcher actually promises.
  it('fails with cli_error on an agy build that does not know stream-json', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'no-stream-json';
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cli_error');
  });

  // agy reports a rejected model in the stream and still exits 0. Transcript
  // recovery must not run for it: the file's newest DONE answered an earlier turn.
  it('fails with the streamed reason when agy reports an error and exits 0', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'error-exit-zero';
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cli_error');
    expect(result.error?.message).toContain('invalid model selection');
  });

  it('fails with cli_error on empty stdout (Issue #76, no transcript recoverable)', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'empty-stdout';
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cli_error');
  });

  it('surfaces agy stderr in the cli_error when stdout is empty (auto-deny notice)', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'empty-stdout-stderr';
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cli_error');
    expect(result.error?.message).toContain('--dangerously-skip-permissions');
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
      modelMap: {
        apex: { model: 'Gemini 3.1 Pro' },
        high: { model: 'Gemini 3.1 Pro' },
        mid: { model: 'x' },
        low: { model: 'y' },
      },
    });
    expect(result.status).toBe('success');
    expect(result.resolvedModel).toBe('Gemini 3.1 Pro');
  });
});

describe('antigravityDispatcher.resume', () => {
  // A ref recorded before agy reported conversation ids is the isolated cwd, which
  // resumes as "the newest conversation in this directory" — once the stream names
  // the conversation, that name replaces the directory for good.
  it('promotes a legacy cwd ref to the conversation id the stream reports', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'success';
    const result = await antigravityDispatcher.resume({
      ...baseOptions(),
      externalSessionRef: '/stored/cwd',
    });
    expect(result.status).toBe('success');
    expect(result.externalSessionRef).toBe(
      '11111111-2222-4333-8444-555555555555',
    );
  });

  it('keeps the stored ref when the run reports no conversation id', async () => {
    process.env.CENNAD_FAKE_AGY_MODE = 'empty-stdout';
    const result = await antigravityDispatcher.resume({
      ...baseOptions(),
      externalSessionRef: '/stored/cwd',
    });
    expect(result.status).toBe('failure');
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
