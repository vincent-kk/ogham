import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, saveConfig, mergeConfig } from '../core/config-manager/index.js';

const TEST_DIR = join(tmpdir(), 'atlassian-test-config-' + Date.now());
const CONFIG_PATH = join(TEST_DIR, 'config.json');

beforeEach(async () => {
  await mkdir(TEST_DIR, { recursive: true });
});

afterEach(async () => {
  await rm(TEST_DIR, { recursive: true, force: true });
});

describe('config-manager', () => {
  describe('loadConfig', () => {
    it('returns empty config when file does not exist', async () => {
      const config = await loadConfig(join(TEST_DIR, 'missing.json'));
      expect(config).toEqual({});
    });

    it('loads and validates config from disk', async () => {
      const data = {
        jira: {
          base_url: 'https://test.atlassian.net',
          auth_type: 'basic',
          username: 'user@test.com',
          is_cloud: true,
          ssl_verify: true,
          timeout: 30000,
        },
      };
      await writeFile(CONFIG_PATH, JSON.stringify(data), 'utf-8');
      const config = await loadConfig(CONFIG_PATH);
      expect(config.jira?.base_url).toBe('https://test.atlassian.net');
      expect(config.jira?.auth_type).toBe('basic');
    });

    it('applies Zod defaults for missing fields', async () => {
      const data = {
        jira: {
          base_url: 'https://test.atlassian.net',
          auth_type: 'basic',
        },
      };
      await writeFile(CONFIG_PATH, JSON.stringify(data), 'utf-8');
      const config = await loadConfig(CONFIG_PATH);
      expect(config.jira?.is_cloud).toBe(true);
      expect(config.jira?.ssl_verify).toBe(true);
      expect(config.jira?.timeout).toBe(30000);
    });

    it('throws on invalid config data', async () => {
      await writeFile(CONFIG_PATH, JSON.stringify({ jira: { auth_type: 'invalid' } }), 'utf-8');
      await expect(loadConfig(CONFIG_PATH)).rejects.toThrow();
    });
  });

  describe('saveConfig', () => {
    it('saves config to disk', async () => {
      const config = {
        jira: {
          base_url: 'https://test.atlassian.net',
          auth_type: 'basic' as const,
          is_cloud: true,
          ssl_verify: true,
          timeout: 30000,
        },
      };
      await saveConfig(config, CONFIG_PATH);
      const loaded = await loadConfig(CONFIG_PATH);
      expect(loaded.jira?.base_url).toBe('https://test.atlassian.net');
    });
  });

  describe('mergeConfig', () => {
    it('merges partial updates into existing config', () => {
      const existing = {
        jira: {
          base_url: 'https://old.atlassian.net',
          auth_type: 'basic' as const,
          is_cloud: true,
          ssl_verify: true,
          timeout: 30000,
        },
      };
      const merged = mergeConfig(existing, {
        confluence: {
          base_url: 'https://wiki.atlassian.net',
          auth_type: 'basic' as const,
          is_cloud: true,
          ssl_verify: true,
          timeout: 30000,
        },
      });
      expect(merged.jira?.base_url).toBe('https://old.atlassian.net');
      expect(merged.confluence?.base_url).toBe('https://wiki.atlassian.net');
    });
  });
});
