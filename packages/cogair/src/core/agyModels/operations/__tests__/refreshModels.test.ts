import { readFile, rm } from 'node:fs/promises';

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
  AGY_MODELS_CACHE_PATH,
  COGAIR_HOME,
} from '../../../../constants/paths.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../../../dispatcher/__tests__/fakeBinary.js';
import { refreshModels } from '../refreshModels.js';

const FIXED_NOW = 1700000000000;

const FAKE_AGY_SUCCESS = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'models') {
  process.stdout.write('gemini-pro\\ngemini-flash\\n');
  process.exit(0);
}
process.exit(1);
`;

const FAKE_AGY_NONZERO = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'models') {
  process.stderr.write('auth required\\n');
  process.exit(1);
}
process.exit(1);
`;

let handle: ReturnType<typeof installFakeBinary>;
let restorePath: () => void;

beforeAll(() => {
  handle = installFakeBinary('agy', FAKE_AGY_SUCCESS);
  restorePath = prependToPath(handle.dir);
});

afterAll(async () => {
  restorePath();
  handle.cleanup();
  await rm(COGAIR_HOME, { recursive: true, force: true });
});

beforeEach(async () => {
  await rm(COGAIR_HOME, { recursive: true, force: true });
});

afterEach(async () => {
  await rm(COGAIR_HOME, { recursive: true, force: true });
});

describe('refreshModels — success', () => {
  it('returns parsed model names from agy models stdout', async () => {
    const models = await refreshModels(FIXED_NOW);
    expect(models).toEqual(['gemini-pro', 'gemini-flash']);
  });

  it('writes the cache file with models and the exact fetched_at timestamp', async () => {
    await refreshModels(FIXED_NOW);
    const raw = await readFile(AGY_MODELS_CACHE_PATH, 'utf8');
    const cache = JSON.parse(raw) as { models: string[]; fetched_at: number };
    expect(cache.models).toEqual(['gemini-pro', 'gemini-flash']);
    expect(cache.fetched_at).toBe(FIXED_NOW);
  });

  it('writes a cache file that is valid JSON ending with a newline', async () => {
    await refreshModels(FIXED_NOW);
    const raw = await readFile(AGY_MODELS_CACHE_PATH, 'utf8');
    expect(raw.endsWith('\n')).toBe(true);
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe('refreshModels — nonzero exit', () => {
  let handleFail: ReturnType<typeof installFakeBinary>;
  let restorePathFail: () => void;

  beforeAll(() => {
    restorePath();
    handleFail = installFakeBinary('agy', FAKE_AGY_NONZERO);
    restorePathFail = prependToPath(handleFail.dir);
  });

  afterAll(() => {
    restorePathFail();
    handleFail.cleanup();
    restorePath = prependToPath(handle.dir);
  });

  it('returns empty array when agy models exits with nonzero code', async () => {
    const models = await refreshModels(FIXED_NOW);
    expect(models).toEqual([]);
  });

  it('does not write a cache file when agy models fails', async () => {
    await refreshModels(FIXED_NOW);
    await expect(readFile(AGY_MODELS_CACHE_PATH, 'utf8')).rejects.toThrow();
  });
});

describe('refreshModels — agy missing', () => {
  let savedPath: string | undefined;

  beforeEach(() => {
    savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
  });

  afterEach(() => {
    process.env.PATH = savedPath;
  });

  it('returns empty array when agy is not on PATH', async () => {
    const models = await refreshModels(FIXED_NOW);
    expect(models).toEqual([]);
  });

  it('does not throw when agy is missing', async () => {
    await expect(refreshModels(FIXED_NOW)).resolves.not.toThrow();
  });
});
