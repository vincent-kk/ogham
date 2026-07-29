import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readHookConfig } from '../../../../hooks/utils/readHookConfig.js';
import type { FilidConfig } from '../loaders/configSchemas.js';
import { loadConfig } from '../loaders/loadConfig.js';
import { loadConfigScope } from '../loaders/loadConfigScope.js';
import { writeConfig } from '../loaders/writeConfig.js';
import { configLayers } from '../utils/configLayers.js';

/**
 * The config now resolves across two layers: a personal user default and the
 * committed project config above it. These cases pin the precedence, the
 * isolation between the two files, and that the zod-free hook path reads the
 * same merge the strict loader does.
 */
describe('config namespaces', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'filid-scope-'));
    tempDirs.push(repoRoot);
    mkdirSync(join(repoRoot, '.git'));
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

  it('reports no config when neither layer has one', () => {
    expect(loadConfig(seedRepo()).config).toBeNull();
  });

  it('uses the user layer when the project has none', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', config({ language: 'ko' }));

    expect(loadConfig(repoRoot).config).toMatchObject({ language: 'ko' });
  });

  it('lets the project layer override only the keys it names', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', config({ language: 'ko' }));
    // A hand-written partial project layer: it names one key and inherits the
    // rest. Validating layers separately would reject this; validating only
    // the merge is what makes it work.
    writeConfig(repoRoot, 'project', {
      rules: { 'max-depth': { enabled: false } },
    } as unknown as FilidConfig);

    expect(loadConfig(repoRoot).config).toMatchObject({
      language: 'ko',
      rules: { 'max-depth': { enabled: false } },
    });
  });

  it('replaces an exempt array wholesale rather than concatenating', () => {
    const repoRoot = seedRepo();
    writeConfig(
      repoRoot,
      'user',
      config({ rules: { 'max-depth': { exempt: ['a/**', 'b/**'] } } }),
    );
    writeConfig(repoRoot, 'project', {
      rules: { 'max-depth': { exempt: ['c/**'] } },
    } as unknown as FilidConfig);

    expect(loadConfig(repoRoot).config?.rules['max-depth']?.exempt).toEqual([
      'c/**',
    ]);
  });

  it('writes the user layer outside the repository', () => {
    const repoRoot = seedRepo();
    const written = writeConfig(repoRoot, 'user', config());

    expect(written.startsWith(repoRoot)).toBe(false);
    expect(written).toBe(configLayers(repoRoot).user);
  });

  it('keeps the project layer at .filid/config.json and the two apart', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', config({ language: 'ko' }));
    const written = writeConfig(
      repoRoot,
      'project',
      config({ language: 'en' }),
    );

    expect(written).toBe(join(repoRoot, '.filid', 'config.json'));
    const scope = loadConfigScope(repoRoot);
    expect(scope.layers.user).toMatchObject({ language: 'ko' });
    expect(scope.layers.project).toMatchObject({ language: 'en' });
    expect(scope.overridden).toContain('language');
  });

  it('degrades to no config when the merged result fails the schema', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', config());
    writeConfig(repoRoot, 'project', {
      version: '2.0',
      adapters: { mode: 'nonsense', enabled: [] },
      rules: {},
    } as unknown as FilidConfig);

    const loaded = loadConfig(repoRoot);
    expect(loaded.config).toBeNull();
    expect(loaded.warnings.length).toBeGreaterThan(0);
  });

  it('gives the hook path the same merge as the strict loader', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', config({ language: 'ko' }));
    writeConfig(repoRoot, 'project', {
      rules: { 'max-depth': { enabled: false } },
    } as unknown as FilidConfig);

    // The hook reads without zod, so this is the case that catches the two
    // read paths drifting apart.
    expect(readHookConfig(repoRoot)).toMatchObject({
      language: 'ko',
      rules: { 'max-depth': { enabled: false } },
    });
  });

  it('reads the user layer from the hook path when no project config exists', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'user', config({ language: 'ko' }));

    expect(readHookConfig(repoRoot)).toMatchObject({ language: 'ko' });
  });

  it('leaves the project config untouched when only the user layer is written', () => {
    const repoRoot = seedRepo();
    writeConfig(repoRoot, 'project', config({ language: 'en' }));
    writeConfig(repoRoot, 'user', config({ language: 'ko' }));

    const onDisk = JSON.parse(
      readFileSync(join(repoRoot, '.filid', 'config.json'), 'utf8'),
    ) as FilidConfig;
    expect(onDisk.language).toBe('en');
  });
});
