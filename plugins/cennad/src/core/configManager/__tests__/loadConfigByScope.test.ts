import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ConfigLayerPaths } from '@ogham/cross-platform/config-scope';
import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import { loadConfigByScope } from '../operations/loadConfigByScope.js';

let layers: ConfigLayerPaths;

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'cennad-by-scope-'));
  layers = {
    user: join(root, 'user', 'config.json'),
    project: join(root, 'workspace', '.cennad', 'config.json'),
  };
});

function seed(path: string, document: Record<string, unknown>): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, JSON.stringify(document), 'utf8');
}

/**
 * The settings page shows one layer at a time, so it needs the document each
 * layer resolves to on its own — not just the merge. These cases pin that the
 * user view never reads the project file and that the project view stays the
 * effective config.
 */
describe('config by scope', () => {
  it('gives both views the defaults when neither layer exists', async () => {
    const byScope = await loadConfigByScope(layers);

    expect(byScope.user).toEqual(DEFAULT_CONFIG);
    expect(byScope.project).toEqual(DEFAULT_CONFIG);
  });

  it('keeps the user view on the user file while the project view takes the override', async () => {
    seed(layers.user, { ...DEFAULT_CONFIG, session_ttl_hours: 24 });
    seed(layers.project as string, { session_ttl_hours: 6 });

    const byScope = await loadConfigByScope(layers);

    expect(byScope.user.session_ttl_hours).toBe(24);
    expect(byScope.project.session_ttl_hours).toBe(6);
  });

  it('leaves the user view at its defaults when only the project layer speaks', async () => {
    seed(layers.project as string, {
      ratio: { codex: { value: 10, enabled: true } },
    });

    const byScope = await loadConfigByScope(layers);

    // Nothing in the user file said anything, so the User tab shows what the
    // plugin ships — the project override belongs to the other tab alone.
    expect(byScope.user.ratio.codex).toEqual(DEFAULT_CONFIG.ratio.codex);
    expect(byScope.project.ratio.codex).toMatchObject({ value: 10 });
  });

  it('matches loadConfig for the project view', async () => {
    seed(layers.user, { ...DEFAULT_CONFIG, session_ttl_hours: 24 });
    seed(layers.project as string, { session_ttl_hours: 6 });

    const byScope = await loadConfigByScope(layers);

    // The page prefills the project tab from this, and the runtime reads
    // `loadConfig`. Two answers to "what is in force" would put a value on
    // screen that nothing obeys.
    const { loadConfig } = await import('../operations/loadConfig.js');
    await expect(loadConfig(layers)).resolves.toEqual(byScope.project);
  });
});
