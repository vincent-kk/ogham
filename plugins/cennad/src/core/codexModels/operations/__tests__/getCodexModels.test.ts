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
  CENNAD_HOME,
  CODEX_MODELS_CACHE_PATH,
} from '../../../../constants/paths.js';
import {
  installFakeBinary,
  prependToPath,
} from '../../../../dispatcher/__tests__/fakeBinary.js';
import type { CodexModel } from '../../../../types/index.js';
import { getCodexModels } from '../getCodexModels.js';

const FAKE_CODEX_SUCCESS = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'debug' && args[1] === 'models') {
  process.stdout.write(JSON.stringify({
    models: [
      {
        slug: 'gpt-5.6-sol',
        description: 'Latest frontier agentic coding model.',
        default_reasoning_level: 'medium',
        supported_reasoning_levels: [
          { effort: 'low' }, { effort: 'medium' }, { effort: 'high' },
          { effort: 'xhigh' }, { effort: 'max' }, { effort: 'ultra' },
        ],
        visibility: 'list',
        supported_in_api: true,
      },
    ],
  }));
  process.exit(0);
}
process.exit(1);
`;

const FAKE_CODEX_FAIL = `#!/usr/bin/env node
process.stderr.write('codex error\\n');
process.exit(1);
`;

const STALE: CodexModel = { slug: 'gpt-5.5', efforts: ['low', 'high'] };

async function seedCache(
  models: CodexModel[],
  fetched_at: number,
): Promise<void> {
  await mkdir(dirname(CODEX_MODELS_CACHE_PATH), { recursive: true });
  await writeFile(
    CODEX_MODELS_CACHE_PATH,
    `${JSON.stringify({ models, fetched_at }, null, 2)}\n`,
    'utf8',
  );
}

describe('getCodexModels — fresh cache within TTL', () => {
  // codex intentionally NOT on PATH here — proves no spawn occurs.

  beforeEach(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  afterAll(async () => {
    await rm(CENNAD_HOME, { recursive: true, force: true });
  });

  it('returns cached models without spawning codex when within the 1h TTL', async () => {
    await seedCache([STALE], Date.now());

    const savedPath = process.env.PATH;
    process.env.PATH = '/nonexistent';
    try {
      await expect(getCodexModels()).resolves.toEqual([STALE]);
    } finally {
      process.env.PATH = savedPath;
    }
  });
});

describe('getCodexModels — refresh via `codex debug models`', () => {
  let handle: ReturnType<typeof installFakeBinary>;
  let restorePath: () => void;

  beforeAll(() => {
    handle = installFakeBinary('codex', FAKE_CODEX_SUCCESS);
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

  it('parses the catalog into slug + advertised efforts when no cache exists', async () => {
    await expect(getCodexModels()).resolves.toEqual([
      {
        slug: 'gpt-5.6-sol',
        efforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
        default_effort: 'medium',
        description: 'Latest frontier agentic coding model.',
      },
    ]);
  });

  it('re-runs codex when the cache is expired', async () => {
    await seedCache([STALE], 0);

    const models = await getCodexModels();
    expect(models.map((model) => model.slug)).toEqual(['gpt-5.6-sol']);
  });

  it('falls back to refresh when the cache file is corrupt', async () => {
    await mkdir(dirname(CODEX_MODELS_CACHE_PATH), { recursive: true });
    await writeFile(CODEX_MODELS_CACHE_PATH, '{ not valid json', 'utf8');

    const models = await getCodexModels();
    expect(models.map((model) => model.slug)).toEqual(['gpt-5.6-sol']);
  });
});

describe('getCodexModels — degrades when codex cannot be probed', () => {
  let handle: ReturnType<typeof installFakeBinary>;
  let restorePath: () => void;

  beforeAll(() => {
    handle = installFakeBinary('codex', FAKE_CODEX_FAIL);
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

  it('returns stale cached models when codex exits nonzero', async () => {
    await seedCache([STALE], 0);

    await expect(getCodexModels()).resolves.toEqual([STALE]);
  });

  it('falls back to the static catalog when refresh fails with no cache', async () => {
    const models = await getCodexModels();
    const sol = models.find((model) => model.slug === 'gpt-5.6-sol');

    expect(sol?.efforts).toContain('ultra');
    expect(
      models.find((model) => model.slug === 'gpt-5.5')?.efforts,
    ).not.toContain('ultra');
  });
});
