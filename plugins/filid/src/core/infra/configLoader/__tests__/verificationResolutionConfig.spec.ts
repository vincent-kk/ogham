// filid:contract AC-config-verification AC-config-resolution
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_VERIFICATION_ORGAN_NAMES } from '../../../../constants/organNames.js';
import { FilidConfigFileSchema, FilidConfigSchema } from '../loaders/configSchemas.js';
import { createDefaultConfig } from '../loaders/createDefaultConfig.js';
import { loadConfig } from '../loaders/loadConfig.js';

const roots: string[] = [];

/**
 * Create an isolated project config layer for round-trip checks.
 * @param config JSON-serializable configuration to persist.
 * @returns Root and project config path, with no user layer involved.
 */
function project(config: unknown): { root: string; path: string } {
  const root = mkdtempSync(join(tmpdir(), 'filid-verification-config-'));
  roots.push(root);
  const path = join(root, '.filid', 'config.json');
  mkdirSync(join(root, '.filid'));
  writeFileSync(path, JSON.stringify(config));
  return { root, path };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('verification configuration', () => {
  it('accepts and round-trips resolution.aliases in raw and normalized schemas', () => {
    const aliases = [{ from: '@app/*', to: 'src/*' }, { from: 'entry', to: 'src/index' }];
    const config = { ...createDefaultConfig(), resolution: { aliases } };
    const { root, path } = project(config);
    expect(FilidConfigFileSchema.parse(config).resolution?.aliases).toEqual(aliases);
    expect(FilidConfigSchema.parse(config).resolution?.aliases).toEqual(aliases);
    expect(loadConfig(root, { user: join(root, 'absent.json'), project: path }).config?.resolution?.aliases).toEqual(aliases);
  });

  it('rejects middle and repeated wildcards, parity mismatches and duplicate sources', () => {
    for (const aliases of [
      [{ from: '@app/*/utils', to: 'src/*' }],
      [{ from: '@app/**', to: 'src/*' }],
      [{ from: '@app/*', to: 'src' }],
      [{ from: '@app', to: 'src/*' }],
      [{ from: '', to: 'src' }],
      [{ from: '@app', to: '' }],
      [{ from: '@app', to: 'src' }, { from: '@app', to: 'lib' }],
    ]) {
      const config = { ...createDefaultConfig(), resolution: { aliases } };
      expect(FilidConfigFileSchema.safeParse(config).success).toBe(false);
      expect(FilidConfigSchema.safeParse(config).success).toBe(false);
    }
  });

  it('drops user resolution while preserving the project list', () => {
    const userAliases = [{ from: 'user/*', to: 'personal/*' }];
    const projectAliases = [{ from: 'project/*', to: 'src/*' }];
    const { root, path } = project(createDefaultConfig());
    const user = join(root, 'user.json');
    writeFileSync(user, JSON.stringify({ ...createDefaultConfig(), resolution: { aliases: userAliases } }));
    expect(loadConfig(root, { user, project: path }).config?.resolution).toBeUndefined();
    expect(loadConfig(root, { user, project: null }).config?.resolution).toBeUndefined();
    writeFileSync(path, JSON.stringify({ ...createDefaultConfig(), resolution: { aliases: projectAliases } }));
    expect(loadConfig(root, { user, project: path }).config?.resolution?.aliases).toEqual(projectAliases);
  });

  it('records defaults in both schemas and round-trips through loadConfig', () => {
    const config = createDefaultConfig();
    expect(config.verification?.organNames).toEqual(['__tests__', '__benchmarks__', 'test', 'tests', 'spec', 'specs', 'fixtures', 'e2e']);
    expect(config.verification?.organNames).toEqual(DEFAULT_VERIFICATION_ORGAN_NAMES);
    expect(FilidConfigFileSchema.parse(config)).toEqual(config);
    expect(FilidConfigSchema.parse(config)).toEqual(config);
    const { root, path } = project(config);
    expect(loadConfig(root, { user: join(root, 'absent-user.json'), project: path }).config).toEqual(config);
  });

  it('round-trips a custom list and an explicit empty list', () => {
    for (const organNames of [['checks'], []]) {
      const config = { ...createDefaultConfig(), verification: { organNames } };
      const { root, path } = project(config);
      expect(FilidConfigFileSchema.parse(config).verification?.organNames).toEqual(organNames);
      expect(loadConfig(root, { user: join(root, 'absent-user.json'), project: path }).config?.verification?.organNames).toEqual(organNames);
    }
  });

  it('rejects empty directory names in raw and normalized schemas', () => {
    const config = { ...createDefaultConfig(), verification: { organNames: [''] } };
    expect(FilidConfigFileSchema.safeParse(config).success).toBe(false);
    expect(FilidConfigSchema.safeParse(config).success).toBe(false);
  });
});
