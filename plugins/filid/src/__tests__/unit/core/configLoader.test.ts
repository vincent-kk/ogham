import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../constants/scanDefaults.js';
import {
  createDefaultConfig,
  initProject,
  loadConfig,
  loadRuleOverrides,
  migrateConfigV1,
  resolveLanguage,
  resolveMaxDepth,
  writeConfig,
} from '../../../core/infra/configLoader/configLoader.js';

function writeRawConfig(root: string, raw: unknown): string {
  const dir = join(root, '.filid');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'config.json');
  writeFileSync(path, JSON.stringify(raw), 'utf8');
  return path;
}

describe('config-loader v2', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `filid-config-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates a v2 default with auto adapter selection', () => {
    const config = createDefaultConfig();

    expect(config.version).toBe('2.0');
    expect(config.adapters.mode).toBe('auto');
    expect(config.adapters.enabled).toContain('ecmascript');
    expect(Object.keys(config.rules)).toHaveLength(
      Object.values(BUILTIN_RULE_IDS).length,
    );
  });

  it('refuses to create explicit adapter selection with no enabled ID', () => {
    expect(() => createDefaultConfig(undefined, [])).toThrow(
      /at least one enabled ID/,
    );
  });

  it('keeps the established hard-rule severities', () => {
    const config = createDefaultConfig();

    expect(config.rules['organ-no-intentmd']?.severity).toBe('error');
    expect(config.rules['circular-dependency']?.severity).toBe('error');
    expect(config.rules['zero-peer-file']?.severity).toBe('warning');
  });

  it('returns null when config does not exist', () => {
    expect(loadConfig(tmpDir)).toEqual({
      config: null,
      warnings: [],
      diagnostics: [],
    });
  });

  it('writes config without overwriting sibling .filid contents', () => {
    mkdirSync(join(tmpDir, '.filid'), { recursive: true });
    writeFileSync(join(tmpDir, '.filid', 'keep.txt'), 'keep', 'utf8');

    writeConfig(tmpDir, createDefaultConfig());

    expect(existsSync(join(tmpDir, '.filid', 'config.json'))).toBe(true);
    expect(readFileSync(join(tmpDir, '.filid', 'keep.txt'), 'utf8')).toBe(
      'keep',
    );
  });

  it('round-trips a strict v2 config', () => {
    const config = createDefaultConfig('Korean', ['ecmascript']);
    config.structure = {
      maxDepth: 4,
      additionalOrganNames: ['plans'],
      additionalAllowedPeers: [{ basename: 'NOTICE' }],
      entryPointOverrides: { ecmascript: ['custom.entry'] },
    };

    writeConfig(tmpDir, config);

    expect(loadConfig(tmpDir)).toEqual({
      config,
      warnings: [],
      diagnostics: [],
    });
  });

  it('returns a warning for invalid JSON', () => {
    mkdirSync(join(tmpDir, '.filid'), { recursive: true });
    writeFileSync(join(tmpDir, '.filid', 'config.json'), 'not-json', 'utf8');

    const result = loadConfig(tmpDir);

    expect(result.config).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('does not reinterpret an unsupported config version as v1', () => {
    writeRawConfig(tmpDir, {
      version: '3.0',
      adapters: { mode: 'auto', enabled: ['future'] },
      rules: {},
    });

    const result = loadConfig(tmpDir);

    expect(result.config).toBeNull();
    expect(result.diagnostics).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes('version'))).toBe(
      true,
    );
  });

  it('returns empty rule overrides without config', () => {
    expect(loadRuleOverrides(tmpDir)).toEqual({});
  });

  it('returns configured rule overrides', () => {
    const config = createDefaultConfig();
    config.rules['organ-no-intentmd'] = {
      enabled: false,
      severity: 'warning',
    };
    writeConfig(tmpDir, config);

    expect(loadRuleOverrides(tmpDir)['organ-no-intentmd']).toEqual({
      enabled: false,
      severity: 'warning',
    });
  });

  it('preserves custom rule overrides', () => {
    const config = createDefaultConfig();
    config.rules['custom-rule'] = { enabled: true, severity: 'info' };
    writeConfig(tmpDir, config);

    expect(loadConfig(tmpDir).config?.rules['custom-rule']).toEqual({
      enabled: true,
      severity: 'info',
    });
  });

  it.each([
    ['configured language', createDefaultConfig('Korean'), 'Korean'],
    ['missing language', createDefaultConfig(), 'en'],
    ['null config', null, 'en'],
  ])('resolves %s', (_name, config, expected) => {
    expect(resolveLanguage(config)).toBe(expected);
  });

  it('resolves max depth from override, v2 structure, then default', () => {
    const config = createDefaultConfig();
    config.structure = { maxDepth: 6 };

    expect(resolveMaxDepth(config, 3)).toBe(3);
    expect(resolveMaxDepth(config)).toBe(6);
    expect(resolveMaxDepth(null)).toBe(DEFAULT_SCAN_OPTIONS.maxDepth);
    expect(resolveMaxDepth(config, 0)).toBe(0);
  });

  it('round-trips a zero max depth', () => {
    const config = createDefaultConfig();
    config.structure = { maxDepth: 0 };
    writeConfig(tmpDir, config);

    expect(resolveMaxDepth(loadConfig(tmpDir).config)).toBe(0);
  });

  it.each([
    ['negative', -1],
    ['non-numeric', 'deep'],
    ['null', null],
  ])(
    'drops an invalid %s structure.maxDepth with a warning',
    (_name, value) => {
      writeRawConfig(tmpDir, {
        version: '2.0',
        adapters: { mode: 'auto', enabled: ['ecmascript'] },
        rules: {},
        structure: { maxDepth: value },
      });

      const result = loadConfig(tmpDir);

      expect(result.config?.structure?.maxDepth).toBeUndefined();
      expect(
        result.warnings.some((warning) => warning.includes('maxDepth')),
      ).toBe(true);
    },
  );

  it('initializes a missing config with requested language and adapters', () => {
    const result = initProject(tmpDir, {
      language: 'Korean',
      adapterIds: ['ecmascript', 'custom'],
    });

    expect(result.configCreated).toBe(true);
    expect(result.filePath.config).toBe(join(tmpDir, '.filid', 'config.json'));
    expect(loadConfig(tmpDir).config).toEqual(
      expect.objectContaining({
        version: '2.0',
        language: 'Korean',
        adapters: { mode: 'explicit', enabled: ['ecmascript', 'custom'] },
      }),
    );
  });

  it('does not overwrite an existing config', () => {
    const config = createDefaultConfig();
    config.language = 'keep';
    writeConfig(tmpDir, config);

    expect(initProject(tmpDir, { language: 'replace' }).configCreated).toBe(
      false,
    );
    expect(loadConfig(tmpDir).config?.language).toBe('keep');
  });

  it('initialization does not deploy rule documents', () => {
    initProject(tmpDir);
    expect(existsSync(join(tmpDir, '.claude', 'rules'))).toBe(false);
  });

  it('migrates v1 structure fields in memory without writing the source', () => {
    const v1 = {
      version: '1.0',
      language: 'Korean',
      rules: { 'organ-no-intentmd': { enabled: true } },
      'additional-allowed': [
        'NOTICE',
        { basename: 'CLAUDE.md', paths: ['packages/**'] },
      ],
      'additional-entry-points': ['custom.entry'],
      'additional-organ-names': ['plans'],
      scan: { maxDepth: 7 },
    };
    const configPath = writeRawConfig(tmpDir, v1);
    const before = readFileSync(configPath, 'utf8');

    const result = loadConfig(tmpDir);

    expect(result.config).toEqual(
      expect.objectContaining({
        version: '2.0',
        language: 'Korean',
        structure: {
          maxDepth: 7,
          additionalOrganNames: ['plans'],
          additionalAllowedPeers: [
            { basename: 'NOTICE' },
            { basename: 'CLAUDE.md', paths: ['packages/**'] },
          ],
          entryPointOverrides: { ecmascript: ['custom.entry'] },
        },
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'config-migration-required' }),
    );
    expect(readFileSync(configPath, 'utf8')).toBe(before);
  });

  it('reports every discarded v1 key', () => {
    const result = migrateConfigV1(
      {
        version: '1.0',
        rules: { 'naming-convention': { enabled: true } },
        'additional-route-patterns': ['^@'],
        promotion: { days: 90 },
      },
      'ecmascript',
    );

    expect(result.diagnostics.map((item) => item.path)).toEqual(
      expect.arrayContaining([
        'rules.naming-convention',
        'additional-route-patterns',
        'promotion',
      ]),
    );
    expect(result.config.rules['naming-convention']).toBeUndefined();
  });

  it('rejects explicit adapter mode with an empty enabled list', () => {
    writeRawConfig(tmpDir, {
      version: '2.0',
      adapters: { mode: 'explicit', enabled: [] },
      rules: {},
    });

    const result = loadConfig(tmpDir);

    expect(result.config).toBeNull();
    expect(result.warnings.some((warning) => warning.includes('enabled'))).toBe(
      true,
    );
  });
});
