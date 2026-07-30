import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { spawnCliSync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import {
  createDefaultConfig,
  initProject,
  loadConfig,
  loadRuleOverrides,
  writeConfig,
} from '../../../core/infra/configLoader/index.js';

vi.mock('@ogham/cross-platform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ogham/cross-platform')>();
  return { ...actual, spawnCliSync: vi.fn(actual.spawnCliSync) };
});

const mockedSpawnCliSync = vi.mocked(spawnCliSync);

function gitRootResult(root: string): ReturnType<typeof spawnCliSync> {
  return {
    code: 0,
    stdout: `${root}\n`,
    stderr: '',
    timedOut: false,
  };
}

function gitRootFailure(): ReturnType<typeof spawnCliSync> {
  return {
    code: 128,
    stdout: '',
    stderr: 'not a git repository',
    timedOut: false,
    spawnError: new Error('not a git repository'),
  };
}

describe('config git-root resolution', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `filid-config-root-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function mockRepoRoot(root: string): void {
    mockedSpawnCliSync.mockImplementation((binary, args) => {
      if (binary === 'git' && [...args].includes('rev-parse'))
        return gitRootResult(root);
      return gitRootFailure();
    });
  }

  it('initializes config at the git root when called from a subdirectory', () => {
    const repoRoot = join(tmpDir, 'repo');
    const subdirectory = join(repoRoot, 'packages', 'sub');
    mkdirSync(subdirectory, { recursive: true });
    mockRepoRoot(repoRoot);

    const result = initProject(subdirectory);

    expect(result.filePath.config).toBe(
      join(repoRoot, '.filid', 'config.json'),
    );
    expect(existsSync(result.filePath.config)).toBe(true);
  });

  it('loads config v2 from the git root when called from a subdirectory', () => {
    const repoRoot = join(tmpDir, 'repo');
    const subdirectory = join(repoRoot, 'packages', 'sub');
    mkdirSync(subdirectory, { recursive: true });
    mockRepoRoot(repoRoot);
    writeConfig(repoRoot, 'project', createDefaultConfig());

    const result = loadConfig(subdirectory);

    expect(result.config?.version).toBe('2.0');
  });

  it('loads rule overrides from the same resolved root', () => {
    const repoRoot = join(tmpDir, 'repo');
    const subdirectory = join(repoRoot, 'packages', 'sub');
    mkdirSync(subdirectory, { recursive: true });
    mockRepoRoot(repoRoot);
    initProject(subdirectory);

    expect(Object.keys(loadRuleOverrides(subdirectory))).toHaveLength(
      Object.values(BUILTIN_RULE_IDS).length,
    );
  });

  it('falls back to the provided path outside a git repository', () => {
    mockedSpawnCliSync.mockImplementation(() => gitRootFailure());

    const result = initProject(tmpDir);

    expect(result.filePath.config).toBe(join(tmpDir, '.filid', 'config.json'));
  });

  it('caches resolution for repeated reads of one path', () => {
    const repoRoot = join(tmpDir, 'repo');
    const subdirectory = join(repoRoot, 'packages', 'sub');
    mkdirSync(subdirectory, { recursive: true });
    mockRepoRoot(repoRoot);
    writeConfig(repoRoot, 'project', createDefaultConfig());
    mockedSpawnCliSync.mockClear();

    loadConfig(subdirectory);
    loadConfig(subdirectory);
    loadRuleOverrides(subdirectory);

    const resolutionCalls = mockedSpawnCliSync.mock.calls.filter(
      ([binary, args]) => binary === 'git' && [...args].includes('rev-parse'),
    );
    expect(resolutionCalls).toHaveLength(1);
  });
});
