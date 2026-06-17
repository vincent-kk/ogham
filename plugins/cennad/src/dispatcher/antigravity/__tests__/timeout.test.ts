import { access } from 'node:fs/promises';
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
import type {
  AntigravityFlags,
  DispatchOptions,
  DispatchResumeOptions,
} from '../../../types/index.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../__tests__/fakeBinary.js';
import { antigravityDispatcher } from '../index.js';

const FLAGS: AntigravityFlags = { sandbox: false, skip_permissions: false };

// Sleeps longer than the test spawnTimeoutMs so ETIMEDOUT fires before exit.
const SLEEP_SCRIPT = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'models') {
  process.stdout.write('Gemini 3.1 Pro\\n');
  process.exit(0);
}
// Never writes stdout. Default 2 s lets spawnTimeoutMs (250 ms) fire first on
// POSIX. On Windows osTimeout floors the timeout to 5 s, so a 2 s exit would beat
// it; the cleanup test overrides FAKE_AGY_SLEEP_MS to outlive any platform timeout.
const sleepMs = Number(process.env.FAKE_AGY_SLEEP_MS) || 2000;
setTimeout(() => { process.exit(0); }, sleepMs);
`;

const SPAWN_TIMEOUT_MS = 250;

let handle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;

beforeAll(() => {
  handle = installFakeBinary('agy', SLEEP_SCRIPT);
  restorePath = prependToPath(handle.dir);
});

afterAll(async () => {
  restorePath();
  handle.cleanup();
  await rm(CENNAD_HOME, { recursive: true, force: true });
});

beforeEach(async () => {
  await rm(CENNAD_HOME, { recursive: true, force: true });
});

afterEach(async () => {
  await rm(CENNAD_HOME, { recursive: true, force: true });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function baseOptions(): DispatchOptions<AntigravityFlags> {
  return {
    prompt: 'hello',
    model: 'mid',
    options: {},
    sessionId: 'timeout-session',
    cwd: process.cwd(),
    flags: FLAGS,
    spawnTimeoutMs: SPAWN_TIMEOUT_MS,
  };
}

function resumeOptions(
  externalSessionRef: string,
): DispatchResumeOptions<AntigravityFlags> {
  return {
    ...baseOptions(),
    externalSessionRef,
  };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function waitUntilGone(p: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await pathExists(p))) return;
    await sleep(100);
  }
}

describe('antigravityDispatcher timeout — start()', () => {
  it('returns failure status when agy exceeds spawnTimeoutMs', async () => {
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.status).toBe('failure');
  });

  it('sets a non-null error on timeout', async () => {
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.error).not.toBeNull();
  });

  it('removes the antigravity-cwd dir after timeout (cleanupCwdOnTimeout fire-and-forget)', async () => {
    // Windows osTimeout floors spawnTimeoutMs (250 ms) to 5 s, so a 2 s self-exit
    // would beat the timeout and skip cleanup. 60 s guarantees the process is
    // always killed by the timeout on every platform, so timedOut === true.
    process.env.FAKE_AGY_SLEEP_MS = '60000';
    try {
      const result = await antigravityDispatcher.start(baseOptions());
      expect(result.status).toBe('failure');
      // cleanupCwdOnTimeout is void (fire-and-forget); poll until the rm settles.
      await waitUntilGone(result.externalSessionRef, 3000);
      const exists = await pathExists(result.externalSessionRef);
      expect(exists).toBe(false);
    } finally {
      delete process.env.FAKE_AGY_SLEEP_MS;
    }
  }, 20_000);

  it('propagates ignoredOptions (empty for antigravity supportedOptions = {})', async () => {
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.ignoredOptions).toEqual([]);
  });

  it('resolvedModel is null when no modelMap is provided', async () => {
    const result = await antigravityDispatcher.start(baseOptions());
    expect(result.resolvedModel).toBeNull();
  });

  it('resolvedModel maps a concrete tier when modelMap is provided', async () => {
    const result = await antigravityDispatcher.start({
      ...baseOptions(),
      model: 'high',
      modelMap: { high: 'Gemini 3.1 Pro', mid: 'x', low: 'y' },
    });
    expect(result.resolvedModel).toBe('Gemini 3.1 Pro');
  });
});

describe('antigravityDispatcher timeout — resume()', () => {
  it('returns failure status when agy exceeds spawnTimeoutMs', async () => {
    const result = await antigravityDispatcher.resume(
      resumeOptions('/stored/cwd'),
    );
    expect(result.status).toBe('failure');
  });

  it('preserves externalSessionRef (does NOT delete cwd on timeout)', async () => {
    const storedRef = '/stored/cwd';
    const result = await antigravityDispatcher.resume(resumeOptions(storedRef));
    expect(result.externalSessionRef).toBe(storedRef);
  });

  it('cwd still exists after resume timeout (ensureCwd re-creates it; no cleanup)', async () => {
    const opts = resumeOptions('/stored/cwd');
    const result = await antigravityDispatcher.resume(opts);
    expect(result.status).toBe('failure');
    // Give enough time to confirm cleanup is NOT called.
    await sleep(300);
    const exists = await pathExists(result.externalSessionRef);
    // externalSessionRef is the stored value ('/stored/cwd'), which never
    // existed. The actual cwd (ANTIGRAVITY_CWD_DIR/<sessionId>) is what
    // ensureCwd creates; assert that one still exists.
    const { antigravityCwdPath } = await import('../../../constants/paths.js');
    const actualCwd = antigravityCwdPath(opts.sessionId);
    const cwdExists = await pathExists(actualCwd);
    expect(cwdExists).toBe(true);
    void exists; // storedRef never existed; no assertion needed on it
  });

  it('propagates ignoredOptions on resume timeout', async () => {
    const result = await antigravityDispatcher.resume(
      resumeOptions('/stored/cwd'),
    );
    expect(result.ignoredOptions).toEqual([]);
  });

  it('resolvedModel maps tier via modelMap on resume timeout', async () => {
    const result = await antigravityDispatcher.resume({
      ...resumeOptions('/stored/cwd'),
      model: 'mid',
      modelMap: { high: 'Gemini 3.1 Pro', mid: 'Gemini 2.5 Flash', low: 'y' },
    });
    expect(result.resolvedModel).toBe('Gemini 2.5 Flash');
  });
});
