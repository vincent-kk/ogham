import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { FilidConfig } from '../loaders/configSchemas.js';
import { loadConfigByScope } from '../loaders/loadConfigByScope.js';
import { writeConfig } from '../loaders/writeConfig.js';
import { configLayers } from '../utils/configLayers.js';

/**
 * The settings page seats its form on one layer at a time, so it needs the
 * config each layer resolves to on its own. These cases pin that the user
 * view never reads the project file and that the project view stays the
 * merge the runtime obeys.
 */
describe('config by scope', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'filid-by-scope-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
    // The user layer sits at the host state root, so it is one file for the
    // whole test file rather than one per repo — `vitest.setup.ts` puts that
    // root in a tmp dir. Clearing it keeps each case's user view its own.
    rmSync(configLayers(repoRoot).user, { force: true });
    return repoRoot;
  }

  function config(overrides: Partial<FilidConfig> = {}): FilidConfig {
    return {
      version: '2.0',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
      ...overrides,
    } as FilidConfig;
  }

  /** A partial project layer, as a team commits it by hand. */
  function seedPartialProject(
    repoRoot: string,
    document: Record<string, unknown>,
  ): void {
    const path = configLayers(repoRoot).project as string;
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, JSON.stringify(document), 'utf8');
  }

  it('reports no config in either view when neither layer has one', () => {
    const byScope = loadConfigByScope(seedRepo());

    expect(byScope.user.config).toBeNull();
    expect(byScope.project.config).toBeNull();
  });

  it('keeps the user view on the user file while the project view takes the override', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', config({ language: 'ko' }));
    seedPartialProject(repoRoot, { language: 'en' });

    const byScope = loadConfigByScope(repoRoot);

    expect(byScope.user.config).toMatchObject({ language: 'ko' });
    expect(byScope.project.config).toMatchObject({ language: 'en' });
  });

  it('leaves the user view empty when only the project layer speaks', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'project', config({ language: 'en' }));

    const byScope = loadConfigByScope(repoRoot);

    // Nothing in the user layer said anything, so the User tab has no config
    // of its own — the page falls back to the shipped defaults there.
    expect(byScope.user.config).toBeNull();
    expect(byScope.project.config).toMatchObject({ language: 'en' });
  });
});
