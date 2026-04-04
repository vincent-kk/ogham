import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { handleConfigGet } from '../../mcp/tools/config-get.js';
import { handleConfigSet } from '../../mcp/tools/config-set.js';
import { handleCacheGet } from '../../mcp/tools/cache-get.js';
import { handleCacheSet } from '../../mcp/tools/cache-set.js';

// --- helpers ---

function makeTmpDir(): string {
  const dir = join(os.tmpdir(), `imbas-cfg-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeConfig(base: string, config: object): void {
  const dir = join(base, '.imbas');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2));
}

function writeCacheFile(base: string, projectKey: string, filename: string, data: object): void {
  const dir = join(base, '.imbas', projectKey, 'cache');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), JSON.stringify(data, null, 2));
}

const BASE_CONFIG = {
  defaults: {
    project_key: 'DEFAULT',
    llm_model: {},
  },
  atlassian: {},
};

// --- tests ---

describe('handleConfigGet', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('returns full config when no field specified', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    const result = await handleConfigGet({});
    expect((result as typeof BASE_CONFIG).defaults.project_key).toBe('DEFAULT');
  });

  it('returns specific field value via dot-path', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    const result = await handleConfigGet({ field: 'defaults.project_key' }) as { field: string; value: unknown };
    expect(result.field).toBe('defaults.project_key');
    expect(result.value).toBe('DEFAULT');
  });

  it('returns undefined for missing dot-path field', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    const result = await handleConfigGet({ field: 'nonexistent.deep.path' }) as { value: unknown };
    expect(result.value).toBeUndefined();
  });

  it('returns default config when config.json does not exist', async () => {
    // no writeConfig — file missing
    const result = await handleConfigGet({});
    expect(result).toBeDefined();
  });
});

describe('handleConfigSet', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('updates and saves config field', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    await handleConfigSet({ updates: { 'defaults.project_key': 'UPDATED' } });

    // Verify the saved value
    const result = await handleConfigGet({ field: 'defaults.project_key' }) as { value: unknown };
    expect(result.value).toBe('UPDATED');
  });

  it('applies multiple dot-path updates at once', async () => {
    writeConfig(tmpDir, BASE_CONFIG);
    await handleConfigSet({ updates: { 'defaults.project_key': 'X', 'defaults.llm_model.validate': 'opus' } });

    const pk = await handleConfigGet({ field: 'defaults.project_key' }) as { value: unknown };
    const lm = await handleConfigGet({ field: 'defaults.llm_model.validate' }) as { value: unknown };
    expect(pk.value).toBe('X');
    expect(lm.value).toBe('opus');
  });
});

describe('handleCacheGet', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('reads cache with expired TTL when cached_at.json is missing', async () => {
    const cacheDir = join(tmpDir, '.imbas', 'PROJ', 'cache');
    mkdirSync(cacheDir, { recursive: true });

    const result = await handleCacheGet({ project_key: 'PROJ', cache_type: 'all' });
    expect(result.ttl_expired).toBe(true);
    expect(result.cached_at).toBeNull();
  });

  it('reads specific cache type', async () => {
    writeCacheFile(tmpDir, 'PROJ', 'project-meta.json', {
      key: 'PROJ', name: 'Project', url: 'https://example.com',
    });
    const now = new Date().toISOString();
    writeCacheFile(tmpDir, 'PROJ', 'cached_at.json', {
      cached_at: now,
      ttl_hours: 24,
    });

    const result = await handleCacheGet({ project_key: 'PROJ', cache_type: 'project-meta' });
    expect((result.cache as { key: string }).key).toBe('PROJ');
  });

  it('throws when project_key missing and no config default', async () => {
    await expect(handleCacheGet({})).rejects.toThrow('project_key is required');
  });
});

describe('handleCacheSet', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('writes cache and returns path and cached_at', async () => {
    const data = { key: 'PROJ', name: 'Test', url: 'https://example.com' };
    const result = await handleCacheSet({ project_key: 'PROJ', cache_type: 'project-meta', data });
    expect(result.path).toContain('project-meta.json');
    expect(result.cached_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('throws when data is undefined', async () => {
    await expect(
      handleCacheSet({ project_key: 'PROJ', cache_type: 'project-meta', data: undefined }),
    ).rejects.toThrow('data is required');
  });

  it('can read back what was written', async () => {
    const data = { key: 'PROJ', name: 'My Project', url: 'https://example.com' };
    await handleCacheSet({ project_key: 'PROJ', cache_type: 'project-meta', data });

    const readResult = await handleCacheGet({ project_key: 'PROJ', cache_type: 'project-meta' });
    expect((readResult.cache as typeof data).name).toBe('My Project');
  });
});
