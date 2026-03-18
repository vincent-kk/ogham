import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import {
  createDefaultConfig,
  initProject,
  loadConfig,
  loadRuleOverrides,
  writeConfig,
} from '../../../core/infra/config-loader.js';
import { BUILTIN_RULE_IDS } from '../../../types/rules.js';

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof import('node:child_process')>('node:child_process');
  return { ...actual, execSync: vi.fn(actual.execSync) };
});

const mockedExecSync = vi.mocked(execSync);

describe('config-loader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `filid-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  // --- Basic: createDefaultConfig ---

  it('createDefaultConfig returns all 8 built-in rules', () => {
    const config = createDefaultConfig();
    expect(config.version).toBe('1.0');
    const ruleIds = Object.keys(config.rules);
    expect(ruleIds).toHaveLength(8);
    for (const id of Object.values(BUILTIN_RULE_IDS)) {
      expect(config.rules[id]).toBeDefined();
      expect(config.rules[id].enabled).toBe(true);
    }
  });

  it('createDefaultConfig severity matches hardcoded defaults', () => {
    const config = createDefaultConfig();
    expect(config.rules['naming-convention'].severity).toBe('warning');
    expect(config.rules['organ-no-intentmd'].severity).toBe('error');
    expect(config.rules['zero-peer-file'].severity).toBe('warning');
    expect(config.rules['max-depth'].severity).toBe('error');
  });

  // --- Basic: loadConfig / writeConfig ---

  it('loadConfig returns null when .filid/config.json does not exist', () => {
    expect(loadConfig(tmpDir)).toBeNull();
  });

  // --- Complex ---

  it('writeConfig creates .filid directory and config.json', () => {
    const config = createDefaultConfig();
    writeConfig(tmpDir, config);
    expect(existsSync(join(tmpDir, '.filid', 'config.json'))).toBe(true);
  });

  it('writeConfig + loadConfig round-trips correctly', () => {
    const config = createDefaultConfig();
    writeConfig(tmpDir, config);
    const loaded = loadConfig(tmpDir);
    expect(loaded).toEqual(config);
  });

  it('loadConfig returns null for invalid JSON', () => {
    const configDir = join(tmpDir, '.filid');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'config.json'), 'not-json', 'utf8');
    expect(loadConfig(tmpDir)).toBeNull();
  });

  it('loadRuleOverrides returns empty object when no config exists', () => {
    const overrides = loadRuleOverrides(tmpDir);
    expect(overrides).toEqual({});
  });

  it('loadRuleOverrides returns rules from config', () => {
    const config = createDefaultConfig();
    config.rules['naming-convention'] = { enabled: false, severity: 'error' };
    writeConfig(tmpDir, config);
    const overrides = loadRuleOverrides(tmpDir);
    expect(overrides['naming-convention']).toEqual({ enabled: false, severity: 'error' });
  });

  it('writeConfig does not overwrite unrelated .filid contents', () => {
    const configDir = join(tmpDir, '.filid');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'other-file.txt'), 'keep me', 'utf8');
    writeConfig(tmpDir, createDefaultConfig());
    expect(existsSync(join(configDir, 'other-file.txt'))).toBe(true);
  });

  it('writeConfig preserves custom rules in config', () => {
    const config = createDefaultConfig();
    config.rules['custom-rule'] = { enabled: true, severity: 'info' };
    writeConfig(tmpDir, config);
    const loaded = loadConfig(tmpDir);
    expect(loaded?.rules['custom-rule']).toEqual({ enabled: true, severity: 'info' });
  });

  // --- initProject ---

  describe('initProject', () => {
    it('creates .filid/config.json when it does not exist', () => {
      const result = initProject(tmpDir, tmpDir);
      expect(result.configCreated).toBe(true);
      expect(existsSync(join(tmpDir, '.filid', 'config.json'))).toBe(true);
    });

    it('does not overwrite existing config.json', () => {
      const custom = createDefaultConfig();
      custom.rules['naming-convention'] = { enabled: false, severity: 'error' };
      writeConfig(tmpDir, custom);
      const result = initProject(tmpDir, tmpDir);
      expect(result.configCreated).toBe(false);
      const loaded = loadConfig(tmpDir);
      expect(loaded?.rules['naming-convention'].enabled).toBe(false);
    });

    it('copies fca.md when template exists in pluginRoot', () => {
      // Create a fake plugin root with template
      const fakePluginRoot = join(tmpDir, 'plugin');
      mkdirSync(join(fakePluginRoot, 'templates', 'rules'), { recursive: true });
      writeFileSync(join(fakePluginRoot, 'templates', 'rules', 'fca.md'), '# FCA Rules', 'utf8');

      const result = initProject(tmpDir, fakePluginRoot);
      expect(result.fcaRulesCopied).toBe(true);
      expect(existsSync(join(tmpDir, '.claude', 'rules', 'fca.md'))).toBe(true);
    });

    it('does not overwrite existing .claude/rules/fca.md', () => {
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(join(tmpDir, '.claude', 'rules', 'fca.md'), '# Custom', 'utf8');

      const fakePluginRoot = join(tmpDir, 'plugin');
      mkdirSync(join(fakePluginRoot, 'templates', 'rules'), { recursive: true });
      writeFileSync(join(fakePluginRoot, 'templates', 'rules', 'fca.md'), '# FCA Rules', 'utf8');

      const result = initProject(tmpDir, fakePluginRoot);
      expect(result.fcaRulesCopied).toBe(false);
      const content = readFileSync(join(tmpDir, '.claude', 'rules', 'fca.md'), 'utf8');
      expect(content).toBe('# Custom');
    });

    it('reports fcaRulesCopied=false when pluginRoot is not provided and env is unset', () => {
      const origEnv = process.env.CLAUDE_PLUGIN_ROOT;
      delete process.env.CLAUDE_PLUGIN_ROOT;
      try {
        const result = initProject(tmpDir);
        expect(result.fcaRulesCopied).toBe(false);
        expect(result.configCreated).toBe(true);
      } finally {
        if (origEnv) process.env.CLAUDE_PLUGIN_ROOT = origEnv;
      }
    });
  });

  // --- resolveGitRoot behavior (tested via loadConfig / initProject) ---

  describe('git root resolution', () => {
    it('resolves git root for subdirectory — initProject writes config at root', () => {
      const fakeGitRoot = join(tmpDir, 'repo');
      const subDir = join(fakeGitRoot, 'packages', 'sub');
      mkdirSync(subDir, { recursive: true });

      mockedExecSync.mockImplementation(((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse')) return fakeGitRoot + '\n';
        throw new Error('unexpected command');
      }) as typeof execSync);

      const result = initProject(subDir, subDir);
      expect(result.configCreated).toBe(true);
      expect(result.filePath.config).toBe(join(fakeGitRoot, '.filid', 'config.json'));
      expect(existsSync(join(fakeGitRoot, '.filid', 'config.json'))).toBe(true);
    });

    it('loadConfig resolves git root — reads config written at repo root from subdirectory', () => {
      const fakeGitRoot = join(tmpDir, 'repo');
      const subDir = join(fakeGitRoot, 'packages', 'sub');
      mkdirSync(subDir, { recursive: true });

      mockedExecSync.mockImplementation(((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse')) return fakeGitRoot + '\n';
        throw new Error('unexpected command');
      }) as typeof execSync);

      // Write config at repo root
      writeConfig(fakeGitRoot, createDefaultConfig());

      // Load from subdirectory — should find it at repo root
      const config = loadConfig(subDir);
      expect(config).not.toBeNull();
      expect(config?.version).toBe('1.0');
    });

    it('loadRuleOverrides resolves git root — consistent with initProject', () => {
      const fakeGitRoot = join(tmpDir, 'repo');
      const subDir = join(fakeGitRoot, 'packages', 'sub');
      mkdirSync(subDir, { recursive: true });

      mockedExecSync.mockImplementation(((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse')) return fakeGitRoot + '\n';
        throw new Error('unexpected command');
      }) as typeof execSync);

      // init from subdirectory writes config at repo root
      initProject(subDir, subDir);

      // loadRuleOverrides from same subdirectory should find it
      const overrides = loadRuleOverrides(subDir);
      expect(Object.keys(overrides)).toHaveLength(8);
    });

    it('falls back to provided path when git root cannot be determined', () => {
      mockedExecSync.mockImplementation((() => {
        throw new Error('not a git repository');
      }) as unknown as typeof execSync);

      const result = initProject(tmpDir, tmpDir);
      expect(result.configCreated).toBe(true);
      // Config should be at tmpDir itself (fallback)
      expect(result.filePath.config).toBe(join(tmpDir, '.filid', 'config.json'));
    });

    it('caches git root resolution — execSync called once per unique path', () => {
      const fakeGitRoot = join(tmpDir, 'repo');
      const subDir = join(fakeGitRoot, 'packages', 'sub');
      mkdirSync(subDir, { recursive: true });

      mockedExecSync.mockImplementation(((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse')) return fakeGitRoot + '\n';
        throw new Error('unexpected command');
      }) as typeof execSync);

      // Write config so loadConfig succeeds
      writeConfig(fakeGitRoot, createDefaultConfig());

      // Call multiple times with same path
      loadConfig(subDir);
      loadConfig(subDir);
      loadRuleOverrides(subDir);

      // execSync should be called only once for this path (cached after first call)
      const revParseCalls = mockedExecSync.mock.calls.filter(
        ([cmd]) => typeof cmd === 'string' && cmd.includes('rev-parse'),
      );
      expect(revParseCalls).toHaveLength(1);
    });
  });
});
