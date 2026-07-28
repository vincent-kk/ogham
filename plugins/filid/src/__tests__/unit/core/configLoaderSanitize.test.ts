import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../../../core/infra/configLoader/index.js';

const V2_BASE = {
  version: '2.0',
  adapters: { mode: 'auto', enabled: [] },
  rules: {},
} as const;

function writeRaw(root: string, raw: unknown): void {
  const dir = join(root, '.filid');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(raw), 'utf8');
}

describe('config-loader v2 sanitize and migration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `filid-sanitize-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('drops and warns for unknown keys nested in a v2 rule override', () => {
    writeRaw(tmpDir, {
      ...V2_BASE,
      rules: {
        'zero-peer-file': {
          enabled: true,
          unknownPeerSetting: ['manifest.file'],
        },
      },
    });

    const { config, warnings, diagnostics } = loadConfig(tmpDir);

    expect(config?.rules['zero-peer-file']).toEqual({ enabled: true });
    expect(
      warnings.some((warning) => warning.includes('unknownPeerSetting')),
    ).toBe(true);
    expect(diagnostics).toEqual([]);
  });

  it('drops invalid exempt globs while keeping valid scoped patterns', () => {
    writeRaw(tmpDir, {
      ...V2_BASE,
      rules: {
        'module-entry-point': {
          exempt: ['[invalid', 'packages/**'],
        },
      },
    });

    const { config, warnings } = loadConfig(tmpDir);

    expect(config?.rules['module-entry-point']?.exempt).toEqual([
      'packages/**',
    ]);
    expect(
      warnings.some(
        (warning) =>
          warning.includes('invalid glob syntax') &&
          warning.includes('[invalid'),
      ),
    ).toBe(true);
  });

  it('drops a bare recursive exempt pattern', () => {
    writeRaw(tmpDir, {
      ...V2_BASE,
      rules: {
        'zero-peer-file': {
          exempt: ['**', 'packages/legacy/**'],
        },
      },
    });

    const { config, warnings } = loadConfig(tmpDir);

    expect(config?.rules['zero-peer-file']?.exempt).toEqual([
      'packages/legacy/**',
    ]);
    expect(warnings.some((warning) => warning.includes('bare "**"'))).toBe(
      true,
    );
  });

  it('drops every unknown v2 top-level key with a warning', () => {
    writeRaw(tmpDir, { ...V2_BASE, bogus: 1, alsoBogus: 2 });

    const { config, warnings, diagnostics } = loadConfig(tmpDir);

    expect('bogus' in (config ?? {})).toBe(false);
    expect('alsoBogus' in (config ?? {})).toBe(false);
    expect(
      warnings.filter((warning) => warning.includes('(dropped')),
    ).toHaveLength(2);
    expect(diagnostics).toEqual([]);
  });

  it('drops one invalid v2 leaf without discarding its rule override', () => {
    writeRaw(tmpDir, {
      ...V2_BASE,
      rules: {
        'module-entry-point': { enabled: true, severity: 'CRITICAL' },
      },
    });

    const { config, warnings } = loadConfig(tmpDir);

    expect(config?.rules['module-entry-point']).toEqual({ enabled: true });
    expect(warnings.some((warning) => warning.includes('severity'))).toBe(true);
  });

  it('emits returned warnings through the config-loader logger in order', () => {
    writeRaw(tmpDir, {
      ...V2_BASE,
      rules: {
        'module-entry-point': { exempt: ['**'] },
      },
      unknownSetting: true,
    });
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { warnings } = loadConfig(tmpDir);
    const loggedWarnings = consoleErrorSpy.mock.calls
      .filter((call) =>
        call.some((argument) =>
          String(argument).includes('[filid:config-loader]'),
        ),
      )
      .map((call) => call.slice(1).map(String).join(' '));

    expect(warnings.length).toBeGreaterThan(0);
    expect(loggedWarnings).toHaveLength(warnings.length);
    warnings.forEach((warning, index) => {
      expect(loggedWarnings[index]).toContain(warning);
    });
  });

  it('loads a valid v2 config without warnings or diagnostics', () => {
    writeRaw(tmpDir, {
      ...V2_BASE,
      language: 'Korean',
      rules: {
        'module-entry-point': { enabled: true, severity: 'warning' },
      },
      structure: {
        maxDepth: 8,
        additionalAllowedPeers: [
          { basename: 'manifest.file', paths: ['packages/**'] },
        ],
      },
    });

    const { config, warnings, diagnostics } = loadConfig(tmpDir);

    expect(config?.version).toBe('2.0');
    expect(config?.structure?.maxDepth).toBe(8);
    expect(warnings).toEqual([]);
    expect(diagnostics).toEqual([]);
  });

  it('returns null with a warning for invalid JSON', () => {
    mkdirSync(join(tmpDir, '.filid'), { recursive: true });
    writeFileSync(join(tmpDir, '.filid', 'config.json'), 'not-json', 'utf8');

    const { config, warnings, diagnostics } = loadConfig(tmpDir);

    expect(config).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
    expect(diagnostics).toEqual([]);
  });

  it('returns null without diagnostics when config is absent', () => {
    expect(loadConfig(tmpDir)).toEqual({
      config: null,
      warnings: [],
      diagnostics: [],
    });
  });

  it('keeps valid scoped exempt patterns unchanged', () => {
    const exempt = ['packages/**', 'src/legacy/**', 'literal/path'];
    writeRaw(tmpDir, {
      ...V2_BASE,
      rules: { 'module-entry-point': { exempt } },
    });

    const { config, warnings } = loadConfig(tmpDir);

    expect(config?.rules['module-entry-point']?.exempt).toEqual(exempt);
    expect(warnings).toEqual([]);
  });

  it('migrates supported v1 fields in memory and reports persistence needed', () => {
    writeRaw(tmpDir, {
      version: '1.0',
      language: 'Korean',
      rules: { 'module-entry-point': { severity: 'error' } },
      scan: { maxDepth: 6 },
      'additional-organ-names': ['plans'],
      'additional-allowed': ['manifest.file'],
      'additional-entry-points': ['module.entry'],
    });

    const { config, warnings, diagnostics } = loadConfig(tmpDir);

    expect(config).toMatchObject({
      version: '2.0',
      language: 'Korean',
      adapters: { mode: 'auto' },
      structure: {
        maxDepth: 6,
        additionalOrganNames: ['plans'],
        additionalAllowedPeers: [{ basename: 'manifest.file' }],
      },
    });
    expect(Object.values(config?.structure?.entryPointOverrides ?? {})).toEqual(
      [['module.entry']],
    );
    expect(warnings).toEqual([]);
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.code === 'config-migration-required',
      ),
    ).toBe(true);
  });

  it('reports removed v1 rules and keys as discarded diagnostics', () => {
    writeRaw(tmpDir, {
      version: '1.0',
      rules: {
        'naming-convention': { enabled: false },
        'index-barrel-pattern': { enabled: false },
      },
      'additional-route-patterns': ['^legacy'],
      unknownSetting: true,
    });

    const { config, warnings, diagnostics } = loadConfig(tmpDir);

    expect(config?.rules).toEqual({});
    expect(warnings).toEqual([]);
    expect(diagnostics.map((diagnostic) => diagnostic.path)).toEqual(
      expect.arrayContaining([
        'rules.naming-convention',
        'rules.index-barrel-pattern',
        'additional-route-patterns',
        'unknownSetting',
      ]),
    );
  });
});
