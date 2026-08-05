import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { getConfigValue, loadConfig } from '../core/configManager/index.js';
import { ImbasConfigSchema } from '../types/config.js';
import type { ImbasConfig } from '../types/config.js';

const dirs: string[] = [];

function makeTempDir(): string {
  const dir = join(tmpdir(), `imbas-cfg-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0))
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
});

function defaultConfig(): ImbasConfig {
  return ImbasConfigSchema.parse({}) as ImbasConfig;
}

// --- Dot-path read ---

describe('getConfigValue', () => {
  it('returns value at dot-path', () => {
    const config = defaultConfig();
    expect(getConfigValue(config, 'version')).toBe('2.0');
  });

  it('returns nested value at dot-path', () => {
    const config = defaultConfig();
    expect(getConfigValue(config, 'defaults.llm_model.refine')).toBe('sonnet');
  });

  it('returns undefined for missing path', () => {
    const config = defaultConfig();
    expect(getConfigValue(config, 'defaults.nonexistent.key')).toBeUndefined();
  });
});

// --- Load ---

describe('loadConfig', () => {
  it('returns defaults when config file is missing', async () => {
    const cwd = makeTempDir();
    const config = await loadConfig(cwd);
    expect(config.version).toBe('2.0');
    expect(config.language.documents).toBe('ko');
    expect(config.defaults.llm_model.estimate).toBe('opus');
  });

  it('loads config from cwd/.imbas/config.json when present', async () => {
    const cwd = makeTempDir();
    mkdirSync(join(cwd, '.imbas'), { recursive: true });
    const customConfig = {
      version: '2.0',
      language: {
        documents: 'en',
        skills: 'en',
        issue_content: 'en',
        reports: 'en',
      },
    };
    writeFileSync(
      join(cwd, '.imbas', 'config.json'),
      JSON.stringify(customConfig),
      'utf-8',
    );
    const config = await loadConfig(cwd);
    expect(config.version).toBe('2.0');
    expect(config.language.documents).toBe('en');
  });

  it('throws when config file has invalid schema', async () => {
    const cwd = makeTempDir();
    mkdirSync(join(cwd, '.imbas'), { recursive: true });
    writeFileSync(
      join(cwd, '.imbas', 'config.json'),
      JSON.stringify({ provider: 'invalid_provider' }),
      'utf-8',
    );
    await expect(loadConfig(cwd)).rejects.toThrow();
  });
});
