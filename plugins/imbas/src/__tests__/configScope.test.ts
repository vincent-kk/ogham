import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  loadConfig,
  loadConfigScope,
  saveConfig,
} from '../core/configManager/configManager.js';
import { ImbasConfigSchema } from '../types/config.js';
import type { ImbasConfig } from '../types/config.js';

const DEFAULTS = ImbasConfigSchema.parse({}) as unknown as ImbasConfig;

let workspace: string;
let userDir: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'imbas-scope-'));
  // The user layer is sandboxed per test file by vitest.setup.ts; point it at a
  // fresh directory per case so ordering cannot leak between them.
  userDir = mkdtempSync(join(tmpdir(), 'imbas-user-'));
  process.env.CLAUDE_CONFIG_DIR = userDir;
});

function userConfigPath(): string {
  return join(userDir, 'plugins', 'imbas', 'config.json');
}

function seed(path: string, document: Record<string, unknown>): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(document), 'utf8');
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

/**
 * The config now resolves across two layers: a personal user default and the
 * per-workspace `.imbas/config.json` above it. These cases pin the
 * precedence, that a partial project layer is enough, and that writing one
 * layer never disturbs the other.
 */
describe('config namespaces', () => {
  it('returns validated defaults when neither layer exists', async () => {
    await expect(loadConfig(workspace)).resolves.toEqual(DEFAULTS);
  });

  it('uses the user layer when the workspace has none', async () => {
    seed(userConfigPath(), { provider: 'github' });

    await expect(loadConfig(workspace)).resolves.toMatchObject({
      provider: 'github',
    });
  });

  it('lets a partial project layer override one key and inherit the rest', async () => {
    seed(userConfigPath(), {
      provider: 'github',
      defaults: { project_ref: 'FROM-USER' },
    });
    seed(join(workspace, '.imbas', 'config.json'), { provider: 'local' });

    const config = await loadConfig(workspace);
    expect(config.provider).toBe('local');
    expect(config.defaults.project_ref).toBe('FROM-USER');
  });

  it('merges nested defaults key by key', async () => {
    seed(userConfigPath(), {
      defaults: { project_ref: 'FROM-USER', llm_model: { validate: 'sonnet' } },
    });
    seed(join(workspace, '.imbas', 'config.json'), {
      defaults: { llm_model: { validate: 'opus' } },
    });

    const config = await loadConfig(workspace);
    expect(config.defaults.project_ref).toBe('FROM-USER');
    expect(config.defaults.llm_model.validate).toBe('opus');
  });

  it('writes the user layer outside the workspace', async () => {
    await saveConfig(workspace, 'user', { ...DEFAULTS, provider: 'github' });

    expect(readJson(userConfigPath())).toMatchObject({ provider: 'github' });
  });

  it('writes the project layer inside .imbas and keeps the two apart', async () => {
    seed(userConfigPath(), { provider: 'github' });

    await saveConfig(workspace, 'project', { ...DEFAULTS, provider: 'local' });

    expect(readJson(userConfigPath())).toEqual({ provider: 'github' });
    expect(readJson(join(workspace, '.imbas', 'config.json'))).toMatchObject({
      provider: 'local',
    });
  });

  it('reports which paths the project layer overrides', () => {
    seed(userConfigPath(), { provider: 'github' });
    seed(join(workspace, '.imbas', 'config.json'), { provider: 'local' });

    expect(loadConfigScope(workspace).overridden).toEqual(['provider']);
  });

  it('reports nothing overridden when only the user layer exists', () => {
    seed(userConfigPath(), { provider: 'github' });

    expect(loadConfigScope(workspace).overridden).toEqual([]);
  });
});
