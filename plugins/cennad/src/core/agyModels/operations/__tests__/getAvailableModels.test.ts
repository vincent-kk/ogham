import { mkdir, rm, writeFile } from 'node:fs/promises';
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
  AGY_MODELS_CACHE_PATH,
  CENNAD_HOME,
} from '../../../../constants/paths.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../../../dispatcher/__tests__/fakeBinary.js';
import { getAvailableModels } from '../getAvailableModels.js';

const FAKE_AGY_SUCCESS = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'models') {
  process.stdout.write('ModelA\\nModelB\\n');
  process.exit(0);
}
process.exit(1);
`;

const FAKE_AGY_FAIL = `#!/usr/bin/env node
process.stderr.write('agy error\\n');
process.exit(1);
`;

async function seedCache(models: string[], fetched_at: number): Promise<void> {
  await mkdir(dirname(AGY_MODELS_CACHE_PATH), { recursive: true });
  await writeFile(
    AGY_MODELS_CACHE_PATH,
    `${JSON.stringify({ models, fetched_at }, null, 2)}\n`,
    'utf8',
  );
}

describe('getAvailableModels — fresh cache within TTL', () => {
  // agy intentionally NOT on PATH for this group — proves no spawn occurs.

  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterAll(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('returns cached models without spawning agy when cache is within the 1h TTL', async () => {
    const fetched_at = Date.now(); // inside 1h window
    await seedCache(['CachedModel1', 'CachedModel2'], fetched_at);

    // agy is not on PATH — any spawn attempt would fail; we still expect models
    const savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
    try {
      const models = await getAvailableModels();
      expect(models).toEqual(['CachedModel1', 'CachedModel2']);
    } finally {
      process.env.PATH = savedPath;
    }
  });

  it('never throws even when called with no cache and no agy binary', async () => {
    const savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
    try {
      await expect(getAvailableModels()).resolves.toEqual([]);
    } finally {
      process.env.PATH = savedPath;
    }
  });
});

describe('getAvailableModels — expired cache triggers refresh', () => {
  let handle: ReturnType<typeof installFakeBinary>;
  let restorePath: () => void;

  beforeAll(() => {
    handle = installFakeBinary('agy', FAKE_AGY_SUCCESS);
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

  it('re-runs agy and returns fresh models when fetched_at is 0 (far in the past)', async () => {
    await seedCache(['StaleModel'], 0);

    const models = await getAvailableModels();
    expect(models).toEqual(['ModelA', 'ModelB']);
  });

  it('returns fresh models when no cache file exists', async () => {
    const models = await getAvailableModels();
    expect(models).toEqual(['ModelA', 'ModelB']);
  });
});

describe('getAvailableModels — stale fallback when refresh fails', () => {
  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('returns stale cached models when cache is expired and agy is unavailable', async () => {
    await seedCache(['StaleModel'], 0);

    const savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
    try {
      const models = await getAvailableModels();
      expect(models).toEqual(['StaleModel']);
    } finally {
      process.env.PATH = savedPath;
    }
  });

  it('returns empty array when no cache exists and agy refresh fails', async () => {
    const savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
    try {
      const models = await getAvailableModels();
      expect(models).toEqual([]);
    } finally {
      process.env.PATH = savedPath;
    }
  });
});

describe('getAvailableModels — corrupt cache file', () => {
  let handle: ReturnType<typeof installFakeBinary>;
  let restorePath: () => void;

  beforeAll(() => {
    handle = installFakeBinary('agy', FAKE_AGY_SUCCESS);
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

  it('falls back to refresh when the cache file contains invalid JSON', async () => {
    await mkdir(dirname(AGY_MODELS_CACHE_PATH), { recursive: true });
    await writeFile(AGY_MODELS_CACHE_PATH, '{ not valid json', 'utf8');

    const models = await getAvailableModels();
    expect(models).toEqual(['ModelA', 'ModelB']);
  });

  it('falls back to refresh when the cache file has wrong schema (missing fetched_at)', async () => {
    await mkdir(dirname(AGY_MODELS_CACHE_PATH), { recursive: true });
    await writeFile(
      AGY_MODELS_CACHE_PATH,
      JSON.stringify({ models: ['BadSchema'] }),
      'utf8',
    );

    const models = await getAvailableModels();
    expect(models).toEqual(['ModelA', 'ModelB']);
  });
});

describe('getAvailableModels — agy returns nonzero exit', () => {
  let handle: ReturnType<typeof installFakeBinary>;
  let restorePath: () => void;

  beforeAll(() => {
    handle = installFakeBinary('agy', FAKE_AGY_FAIL);
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

  it('returns stale models when agy exits nonzero and a stale cache is present', async () => {
    await seedCache(['StaleOnFail'], 0);

    const models = await getAvailableModels();
    expect(models).toEqual(['StaleOnFail']);
  });

  it('returns empty array when agy exits nonzero and no cache exists', async () => {
    const models = await getAvailableModels();
    expect(models).toEqual([]);
  });
});
