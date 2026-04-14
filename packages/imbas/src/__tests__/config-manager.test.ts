import { describe, expect, it, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import {
  getConfigValue,
  setConfigValue,
  applyConfigUpdates,
  loadConfig,
} from '../core/config-manager/config-manager.js';
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
  for (const dir of dirs.splice(0)) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
});

function defaultConfig(): ImbasConfig {
  return ImbasConfigSchema.parse({}) as ImbasConfig;
}

// --- Basic (3) ---

describe('getConfigValue', () => {
  it('returns value at dot-path', () => {
    const config = defaultConfig();
    expect(getConfigValue(config, 'version')).toBe('1.0');
  });

  it('returns nested value at dot-path', () => {
    const config = defaultConfig();
    expect(getConfigValue(config, 'defaults.llm_model.validate')).toBe('sonnet');
  });

  it('returns undefined for missing path', () => {
    const config = defaultConfig();
    expect(getConfigValue(config, 'defaults.nonexistent.key')).toBeUndefined();
  });
});

// --- Complex (12) ---

describe('setConfigValue', () => {
  it('returns new config with updated value (immutable)', () => {
    const config = defaultConfig();
    const updated = setConfigValue(config, 'version', '2.0');
    expect(updated.version).toBe('2.0');
    expect(config.version).toBe('1.0');
  });

  it('updates nested dot-path value', () => {
    const config = defaultConfig();
    const updated = setConfigValue(config, 'defaults.llm_model.devplan', 'haiku');
    expect(getConfigValue(updated, 'defaults.llm_model.devplan')).toBe('haiku');
    expect(getConfigValue(config, 'defaults.llm_model.devplan')).toBe('opus');
  });

  it('creates intermediate objects when path does not exist', () => {
    const config = defaultConfig();
    const updated = setConfigValue(config, 'language.documents', 'en');
    expect(getConfigValue(updated, 'language.documents')).toBe('en');
  });

  it('preserves other keys when updating one path', () => {
    const config = defaultConfig();
    const updated = setConfigValue(config, 'defaults.llm_model.validate', 'haiku');
    expect(getConfigValue(updated, 'defaults.llm_model.split')).toBe('sonnet');
    expect(getConfigValue(updated, 'defaults.llm_model.devplan')).toBe('opus');
  });
});

describe('applyConfigUpdates', () => {
  it('applies multiple dot-path updates at once', () => {
    const config = defaultConfig();
    const updated = applyConfigUpdates(config, {
      'version': '3.0',
      'defaults.llm_model.validate': 'haiku',
      'language.documents': 'en',
    });
    expect(updated.version).toBe('3.0');
    expect(getConfigValue(updated, 'defaults.llm_model.validate')).toBe('haiku');
    expect(getConfigValue(updated, 'language.documents')).toBe('en');
  });

  it('is immutable — original unchanged after batch update', () => {
    const config = defaultConfig();
    applyConfigUpdates(config, { 'version': '9.9' });
    expect(config.version).toBe('1.0');
  });

  it('applies updates sequentially (later values win)', () => {
    const config = defaultConfig();
    const updated = applyConfigUpdates(config, {
      'defaults.llm_model.validate': 'haiku',
    });
    const updated2 = applyConfigUpdates(updated, {
      'defaults.llm_model.validate': 'opus',
    });
    expect(getConfigValue(updated2, 'defaults.llm_model.validate')).toBe('opus');
  });
});

describe('loadConfig', () => {
  it('returns defaults when config file is missing', async () => {
    const cwd = makeTempDir();
    const config = await loadConfig(cwd);
    expect(config.version).toBe('1.0');
    expect(config.language.documents).toBe('ko');
    expect(config.defaults.llm_model.devplan).toBe('opus');
  });

  it('loads config from cwd/.imbas/config.json when present', async () => {
    const cwd = makeTempDir();
    mkdirSync(join(cwd, '.imbas'), { recursive: true });
    const customConfig = {
      version: '2.0',
      language: { documents: 'en', skills: 'en', issue_content: 'en', reports: 'en' },
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
