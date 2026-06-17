import { rm } from 'node:fs/promises';

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { CENNAD_HOME } from '../../../constants/paths.js';
import type { DispatchOptions, GeminiFlags } from '../../../types/index.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../__tests__/fakeBinary.js';
import { geminiDispatcher } from '../index.js';

const FLAGS_SANDBOX_AUTO: GeminiFlags = {
  yolo: false,
  sandbox: true,
  sandbox_backend: 'auto',
};

const FAKE_SCRIPT = `#!/usr/bin/env node
const args = process.argv.slice(2);
const mode = process.env.CENNAD_FAKE_GEMINI_MODE || 'success';
const uuid = process.env.CENNAD_FAKE_GEMINI_UUID || '11111111-2222-3333-4444-555566667777';
const index = process.env.CENNAD_FAKE_GEMINI_INDEX || '1';

if (args.includes('--list-sessions')) {
  const listMode = process.env.CENNAD_FAKE_GEMINI_LIST_MODE || 'present';
  if (listMode === 'empty') process.exit(0);
  if (listMode === 'fail') {
    process.stderr.write('list failed\\n');
    process.exit(1);
  }
  process.stdout.write('  ' + index + '. Test session (2026-01-01 12:00:00) [' + uuid + ']\\n');
  process.exit(0);
}

if (mode === 'success') {
  process.stdout.write('fake gemini response\\n');
  process.exit(0);
} else if (mode === 'auth-stderr') {
  process.stderr.write('HTTP 401 Unauthorized\\n');
  process.exit(1);
} else if (mode === 'rate-limit-stderr') {
  process.stderr.write('HTTP 429 Too Many Requests\\n');
  process.exit(1);
} else if (mode === 'network-stderr') {
  process.stderr.write('ECONNRESET\\n');
  process.exit(1);
} else if (mode === 'exit-55') {
  process.exit(55);
} else if (mode === 'exit-53') {
  process.exit(53);
} else if (mode === 'retry-storm') {
  process.stderr.write('Attempt 1 failed: quota exhausted. Retrying after 5000ms...\\n');
  process.stderr.write('Attempt 2 failed: quota exhausted. Retrying after 9000ms...\\n');
  setInterval(() => {}, 1000);
} else {
  process.exit(2);
}
`;

let handle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;

beforeAll(() => {
  handle = installFakeBinary('gemini', FAKE_SCRIPT);
  restorePath = prependToPath(handle.dir);
});

afterAll(() => {
  restorePath();
  handle.cleanup();
});

beforeEach(async () => {
  await rm(CENNAD_HOME, { recursive: true, force: true });
  delete process.env.CENNAD_FAKE_GEMINI_MODE;
  delete process.env.CENNAD_FAKE_GEMINI_UUID;
  delete process.env.CENNAD_FAKE_GEMINI_INDEX;
  delete process.env.CENNAD_FAKE_GEMINI_LIST_MODE;
});

afterAll(async () => {
  await rm(CENNAD_HOME, { recursive: true, force: true });
});

function baseOptions(): DispatchOptions<GeminiFlags> {
  return {
    prompt: 'hello',
    model: 'auto',
    options: {},
    sessionId: 'cennad-session',
    cwd: process.cwd(),
    flags: FLAGS_SANDBOX_AUTO,
    spawnTimeoutMs: 10000,
  };
}

describe('geminiDispatcher.start', () => {
  it('returns success, captures stdout as response, and reads UUID from --list-sessions', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'success';
    process.env.CENNAD_FAKE_GEMINI_UUID =
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff';
    const result = await geminiDispatcher.start(baseOptions());
    expect(result.status).toBe('success');
    expect(result.response).toBe('fake gemini response');
    expect(result.externalSessionRef).toBe(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff',
    );
  });

  it('maps HTTP 401 stderr to an auth failure', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'auth-stderr';
    const result = await geminiDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('auth');
  });

  it('maps HTTP 429 stderr to a rate_limit failure', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'rate-limit-stderr';
    const result = await geminiDispatcher.start(baseOptions());
    expect(result.error?.code).toBe('rate_limit');
  });

  it('maps ECONNRESET stderr to a network failure', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'network-stderr';
    const result = await geminiDispatcher.start(baseOptions());
    expect(result.error?.code).toBe('network');
  });

  it('maps exit 55 to auth (untrusted workspace)', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'exit-55';
    const result = await geminiDispatcher.start(baseOptions());
    expect(result.error?.code).toBe('auth');
  });

  it('aborts a retry storm and maps it to rate_limit', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'retry-storm';
    const result = await geminiDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('rate_limit');
  }, 15_000);

  it('fails when --list-sessions returns no entries (cannot capture UUID)', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'success';
    process.env.CENNAD_FAKE_GEMINI_LIST_MODE = 'empty';
    const result = await geminiDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('unknown');
  });

  it('records unsupported options in ignoredOptions', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'success';
    const result = await geminiDispatcher.start({
      ...baseOptions(),
      options: { multi_agent: true } as Record<string, unknown>,
    });
    expect(result.ignoredOptions).toContain('multi_agent');
  });
});

describe('geminiDispatcher.resume', () => {
  it('resolves the stored UUID to the current index and preserves externalSessionRef', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'success';
    process.env.CENNAD_FAKE_GEMINI_UUID =
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff';
    process.env.CENNAD_FAKE_GEMINI_INDEX = '7';
    const result = await geminiDispatcher.resume({
      ...baseOptions(),
      externalSessionRef: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff',
    });
    expect(result.status).toBe('success');
    expect(result.externalSessionRef).toBe(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff',
    );
  });

  it('returns unknown failure when the stored UUID is not in --list-sessions', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'success';
    process.env.CENNAD_FAKE_GEMINI_UUID =
      '11111111-2222-3333-4444-555566667777';
    const result = await geminiDispatcher.resume({
      ...baseOptions(),
      externalSessionRef: 'deadbeef-0000-0000-0000-000000000000',
    });
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('unknown');
  });

  it('passes through budget_exhausted (exit 53) from the prompt call', async () => {
    process.env.CENNAD_FAKE_GEMINI_MODE = 'exit-53';
    process.env.CENNAD_FAKE_GEMINI_UUID =
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff';
    const result = await geminiDispatcher.resume({
      ...baseOptions(),
      externalSessionRef: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeffffff',
    });
    expect(result.error?.code).toBe('budget_exhausted');
  });
});

describe('geminiDispatcher cli-missing', () => {
  let savedPath: string | undefined;

  beforeEach(() => {
    savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
  });

  afterEach(() => {
    process.env.PATH = savedPath;
  });

  it('returns cli_error when gemini is not on PATH', async () => {
    const result = await geminiDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
    expect(result.error?.code).toBe('cli_error');
  });
});
