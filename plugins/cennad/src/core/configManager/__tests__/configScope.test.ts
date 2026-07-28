import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ConfigLayerPaths } from '@ogham/cross-platform/config-scope';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { loadConfig } from '../operations/loadConfig.js';
import { loadConfigState } from '../operations/loadConfigState.js';
import { saveConfig } from '../operations/saveConfig.js';

let layers: ConfigLayerPaths;

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'cennad-layers-'));
  layers = {
    user: join(root, 'user', 'config.json'),
    project: join(root, 'workspace', '.cennad', 'config.json'),
  };
});

function seed(path: string, document: Record<string, unknown>): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(document), 'utf8');
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

/**
 * The routing policy now resolves across two layers: a personal default and
 * a per-project override. These cases pin the precedence, that a partial
 * project layer is enough, and that writing one layer never disturbs the
 * other.
 */
describe('config namespaces', () => {
  it('falls back to defaults when neither layer exists', async () => {
    await expect(loadConfig(layers)).resolves.toEqual(DEFAULT_CONFIG);
  });

  it('uses the user layer alone', async () => {
    seed(layers.user, { ...DEFAULT_CONFIG, session_ttl_hours: 24 });

    await expect(loadConfig(layers)).resolves.toMatchObject({
      session_ttl_hours: 24,
    });
  });

  it('lets a partial project layer override one key and inherit the rest', async () => {
    seed(layers.user, { ...DEFAULT_CONFIG, session_ttl_hours: 24 });
    seed(layers.project as string, { session_ttl_hours: 6 });

    const config = await loadConfig(layers);
    expect(config.session_ttl_hours).toBe(6);
    // Everything the project layer did not name still comes from the user layer.
    expect(config.ratio).toEqual(DEFAULT_CONFIG.ratio);
  });

  it('merges nested provider settings key by key', async () => {
    seed(layers.user, DEFAULT_CONFIG as unknown as Record<string, unknown>);
    seed(layers.project as string, {
      ratio: { codex: { value: 10, enabled: true } },
    });

    const config = await loadConfig(layers);
    expect(config.ratio.codex).toMatchObject({ value: 10, enabled: true });
    expect(config.ratio.claude).toEqual(DEFAULT_CONFIG.ratio.claude);
  });

  it('degrades to defaults when the merged result fails the schema', async () => {
    seed(layers.user, DEFAULT_CONFIG as unknown as Record<string, unknown>);
    seed(layers.project as string, { session_ttl_hours: -1 });

    await expect(loadConfig(layers)).resolves.toEqual(DEFAULT_CONFIG);
  });

  it('treats a damaged layer as absent rather than throwing', async () => {
    mkdirSync(join(layers.user, '..'), { recursive: true });
    writeFileSync(layers.user, '{ not json', 'utf8');
    seed(layers.project as string, { session_ttl_hours: 6 });

    await expect(loadConfig(layers)).resolves.toMatchObject({
      session_ttl_hours: 6,
    });
  });

  it('writes the user layer without touching the project layer', async () => {
    seed(layers.project as string, { session_ttl_hours: 6 });

    await saveConfig('user', { session_ttl_hours: 24 }, layers);

    expect(readJson(layers.user)).toEqual({ session_ttl_hours: 24 });
    expect(readJson(layers.project as string)).toEqual({
      session_ttl_hours: 6,
    });
  });

  it('writes the project layer without touching the user layer', async () => {
    seed(layers.user, { session_ttl_hours: 24 });

    const state = await saveConfig('project', { session_ttl_hours: 6 }, layers);

    expect(readJson(layers.user)).toEqual({ session_ttl_hours: 24 });
    expect(state.overridden).toEqual(['session_ttl_hours']);
  });

  it('refuses to write a project layer that has no path', async () => {
    await expect(
      saveConfig('project', {}, { user: layers.user, project: null }),
    ).rejects.toThrow(/no project root/);
  });

  it('reports which paths the project layer overrides', () => {
    seed(layers.user, DEFAULT_CONFIG as unknown as Record<string, unknown>);
    seed(layers.project as string, {
      ratio: { codex: { enabled: false } },
    });

    expect(loadConfigState(layers).overridden).toEqual(['ratio.codex.enabled']);
  });
});
