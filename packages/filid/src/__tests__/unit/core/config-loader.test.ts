import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultConfig,
  getRuleDocsStatus,
  initProject,
  loadConfig,
  loadRuleOverrides,
  resolveLanguage,
  resolveMaxDepth,
  resolveRuleDocSelection,
  syncRuleDocs,
  writeConfig,
} from '../../../core/infra/config-loader/config-loader.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../constants/scan-defaults.js';
import { BUILTIN_RULE_IDS } from '../../../types/rules.js';

vi.mock('node:child_process', async () => {
  const actual =
    await vi.importActual<typeof import('node:child_process')>(
      'node:child_process',
    );
  return { ...actual, execSync: vi.fn(actual.execSync) };
});

const mockedExecSync = vi.mocked(execSync);

describe('config-loader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `filid-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
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
    expect(overrides['naming-convention']).toEqual({
      enabled: false,
      severity: 'error',
    });
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
    expect(loaded?.rules['custom-rule']).toEqual({
      enabled: true,
      severity: 'info',
    });
  });

  // --- resolveLanguage ---

  it('resolveLanguage returns configured language when set', () => {
    const config = createDefaultConfig();
    config.language = 'ko';
    expect(resolveLanguage(config)).toBe('ko');
  });

  it('resolveLanguage returns "en" when language is not set', () => {
    const config = createDefaultConfig();
    expect(resolveLanguage(config)).toBe('en');
  });

  it('resolveLanguage returns "en" when config is null', () => {
    expect(resolveLanguage(null)).toBe('en');
  });

  // --- resolveMaxDepth + scan.maxDepth round-trip ---

  describe('resolveMaxDepth', () => {
    it('returns default when config is null and no override', () => {
      expect(resolveMaxDepth(null)).toBe(DEFAULT_SCAN_OPTIONS.maxDepth);
    });

    it('returns default when config has no scan field', () => {
      expect(resolveMaxDepth(createDefaultConfig())).toBe(
        DEFAULT_SCAN_OPTIONS.maxDepth,
      );
    });

    it('returns config.scan.maxDepth when set and no override', () => {
      const config = createDefaultConfig();
      config.scan = { maxDepth: 6 };
      expect(resolveMaxDepth(config)).toBe(6);
    });

    it('override takes precedence over config', () => {
      const config = createDefaultConfig();
      config.scan = { maxDepth: 6 };
      expect(resolveMaxDepth(config, 3)).toBe(3);
    });

    it('override of 0 is honoured (explicit early termination)', () => {
      expect(resolveMaxDepth(null, 0)).toBe(0);
    });

    it('config.scan.maxDepth of 0 is honoured', () => {
      const config = createDefaultConfig();
      config.scan = { maxDepth: 0 };
      expect(resolveMaxDepth(config)).toBe(0);
    });

    it('writeConfig + loadConfig preserves scan.maxDepth', () => {
      const config = createDefaultConfig();
      config.scan = { maxDepth: 4 };
      writeConfig(tmpDir, config);
      const loaded = loadConfig(tmpDir);
      expect(loaded?.scan?.maxDepth).toBe(4);
      expect(resolveMaxDepth(loaded)).toBe(4);
    });
  });

  describe('scan.maxDepth validation', () => {
    function writeRawConfig(raw: unknown): void {
      const dir = join(tmpDir, '.filid');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'config.json'),
        JSON.stringify(raw),
        'utf8',
      );
    }

    it('loadConfig strips negative scan.maxDepth and falls back', () => {
      writeRawConfig({ version: '1.0', rules: {}, scan: { maxDepth: -1 } });
      const loaded = loadConfig(tmpDir);
      expect(loaded).not.toBeNull();
      expect(loaded?.scan?.maxDepth).toBeUndefined();
      expect(resolveMaxDepth(loaded)).toBe(DEFAULT_SCAN_OPTIONS.maxDepth);
    });

    it('loadConfig strips non-numeric scan.maxDepth', () => {
      writeRawConfig({
        version: '1.0',
        rules: {},
        scan: { maxDepth: 'deep' },
      });
      const loaded = loadConfig(tmpDir);
      expect(loaded?.scan?.maxDepth).toBeUndefined();
    });

    it('loadConfig strips non-finite scan.maxDepth (Infinity)', () => {
      // JSON.stringify(Infinity) → "null", so we write the raw string manually
      const dir = join(tmpDir, '.filid');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'config.json'),
        '{"version":"1.0","rules":{},"scan":{"maxDepth":null}}',
        'utf8',
      );
      const loaded = loadConfig(tmpDir);
      expect(loaded?.scan?.maxDepth).toBeUndefined();
    });
  });

  // --- initProject (config only) ---

  describe('initProject', () => {
    it('creates .filid/config.json when it does not exist', () => {
      const result = initProject(tmpDir);
      expect(result.configCreated).toBe(true);
      expect(existsSync(join(tmpDir, '.filid', 'config.json'))).toBe(true);
    });

    it('does not overwrite existing config.json', () => {
      const custom = createDefaultConfig();
      custom.rules['naming-convention'] = { enabled: false, severity: 'error' };
      writeConfig(tmpDir, custom);
      const result = initProject(tmpDir);
      expect(result.configCreated).toBe(false);
      const loaded = loadConfig(tmpDir);
      expect(loaded?.rules['naming-convention'].enabled).toBe(false);
    });

    it('never touches .claude/rules/ — that is the filid-setup skill job', () => {
      initProject(tmpDir);
      expect(existsSync(join(tmpDir, '.claude', 'rules'))).toBe(false);
    });

    it('exposes only config path in InitResult.filePath', () => {
      const result = initProject(tmpDir);
      expect(result.filePath.config).toBe(
        join(tmpDir, '.filid', 'config.json'),
      );
      // fcaRules field intentionally removed — belongs to syncRuleDocs now
      expect('fcaRules' in result.filePath).toBe(false);
    });
  });

  // --- Rule doc sync framework ---

  describe('syncRuleDocs', () => {
    function setupFakePluginRoot(extraRuleFiles: string[] = []): string {
      const pluginRoot = join(tmpDir, 'plugin');
      mkdirSync(join(pluginRoot, 'templates', 'rules'), { recursive: true });
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'fca.md'),
        '# FCA Rules Template',
        'utf8',
      );
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'manifest.json'),
        JSON.stringify({
          version: '1.0',
          rules: [
            {
              id: 'fca',
              filename: 'fca.md',
              required: true,
              title: 'FCA-AI Architecture Rules',
              description: 'Mandatory FCA rules',
            },
            ...extraRuleFiles.map((name) => ({
              id: name,
              filename: `${name}.md`,
              required: false,
              title: `${name} rules`,
              description: `optional ${name}`,
            })),
          ],
        }),
        'utf8',
      );
      for (const name of extraRuleFiles) {
        writeFileSync(
          join(pluginRoot, 'templates', 'rules', `${name}.md`),
          `# ${name} template`,
          'utf8',
        );
      }
      return pluginRoot;
    }

    it('deploys required rule doc regardless of selection', () => {
      const pluginRoot = setupFakePluginRoot();
      const result = syncRuleDocs(tmpDir, [], pluginRoot);
      expect(result.copied).toContain('fca.md');
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', 'fca.md')),
      ).toBe(true);
    });

    it('preserves existing files (no overwrite)', () => {
      const pluginRoot = setupFakePluginRoot();
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.claude', 'rules', 'fca.md'),
        '# Custom user edits',
        'utf8',
      );
      const result = syncRuleDocs(tmpDir, [], pluginRoot);
      expect(result.copied).not.toContain('fca.md');
      expect(result.unchanged).toContain('fca.md');
      const content = readFileSync(
        join(tmpDir, '.claude', 'rules', 'fca.md'),
        'utf8',
      );
      expect(content).toBe('# Custom user edits');
    });

    it('copies optional rule doc when selected', () => {
      const pluginRoot = setupFakePluginRoot(['extra']);
      const result = syncRuleDocs(tmpDir, ['extra'], pluginRoot);
      expect(result.copied).toContain('extra.md');
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', 'extra.md')),
      ).toBe(true);
    });

    it('removes optional rule doc when unselected', () => {
      const pluginRoot = setupFakePluginRoot(['extra']);
      // First deploy
      syncRuleDocs(tmpDir, ['extra'], pluginRoot);
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', 'extra.md')),
      ).toBe(true);
      // Then unselect
      const result = syncRuleDocs(tmpDir, [], pluginRoot);
      expect(result.removed).toContain('extra.md');
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', 'extra.md')),
      ).toBe(false);
      // Required rule is still there
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', 'fca.md')),
      ).toBe(true);
    });

    it('skips with error reason when pluginRoot cannot be resolved', () => {
      const origEnv = process.env.CLAUDE_PLUGIN_ROOT;
      delete process.env.CLAUDE_PLUGIN_ROOT;
      try {
        const result = syncRuleDocs(tmpDir, ['fca']);
        expect(result.skipped.length).toBe(1);
        expect(result.skipped[0].id).toBe('*');
      } finally {
        if (origEnv) process.env.CLAUDE_PLUGIN_ROOT = origEnv;
      }
    });

    it('skips individual rule when template file is missing', () => {
      const pluginRoot = setupFakePluginRoot();
      // Point manifest at a file that doesn't exist
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'manifest.json'),
        JSON.stringify({
          version: '1.0',
          rules: [
            {
              id: 'ghost',
              filename: 'ghost.md',
              required: false,
              title: 'ghost',
              description: 'missing template',
            },
          ],
        }),
        'utf8',
      );
      const result = syncRuleDocs(tmpDir, ['ghost'], pluginRoot);
      expect(result.skipped.some((s) => s.id === 'ghost')).toBe(true);
    });
  });

  describe('getRuleDocsStatus', () => {
    it('returns entries with deployed/selected flags', () => {
      const pluginRoot = join(tmpDir, 'plugin');
      mkdirSync(join(pluginRoot, 'templates', 'rules'), { recursive: true });
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'fca.md'),
        '# FCA',
        'utf8',
      );
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'extra.md'),
        '# Extra',
        'utf8',
      );
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'manifest.json'),
        JSON.stringify({
          version: '1.0',
          rules: [
            {
              id: 'fca',
              filename: 'fca.md',
              required: true,
              title: 'FCA',
              description: 'required',
            },
            {
              id: 'extra',
              filename: 'extra.md',
              required: false,
              title: 'Extra',
              description: 'optional',
            },
          ],
        }),
        'utf8',
      );

      // config with extra opted in
      const config = createDefaultConfig();
      config['injected-rules'] = { extra: true };
      writeConfig(tmpDir, config);

      // deploy fca only
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.claude', 'rules', 'fca.md'),
        '# Deployed FCA',
        'utf8',
      );

      const status = getRuleDocsStatus(tmpDir, pluginRoot);
      expect(status.pluginRootResolved).toBe(true);
      expect(status.entries).toHaveLength(2);

      const fca = status.entries.find((e) => e.id === 'fca');
      expect(fca).toBeDefined();
      expect(fca!.required).toBe(true);
      expect(fca!.deployed).toBe(true);
      expect(fca!.selected).toBe(true);

      const extra = status.entries.find((e) => e.id === 'extra');
      expect(extra).toBeDefined();
      expect(extra!.required).toBe(false);
      expect(extra!.deployed).toBe(false);
      expect(extra!.selected).toBe(true); // opted in via injected-rules
    });

    it('returns pluginRootResolved=false when env is unset and no arg', () => {
      const origEnv = process.env.CLAUDE_PLUGIN_ROOT;
      delete process.env.CLAUDE_PLUGIN_ROOT;
      try {
        const status = getRuleDocsStatus(tmpDir);
        expect(status.pluginRootResolved).toBe(false);
        expect(status.entries).toEqual([]);
      } finally {
        if (origEnv) process.env.CLAUDE_PLUGIN_ROOT = origEnv;
      }
    });
  });

  describe('resolveRuleDocSelection', () => {
    const manifest = {
      version: '1.0',
      rules: [
        {
          id: 'fca',
          filename: 'fca.md',
          required: true,
          title: 'FCA',
          description: '',
        },
        {
          id: 'style',
          filename: 'style.md',
          required: false,
          title: 'Style',
          description: '',
        },
      ],
    };

    it('always includes required ids', () => {
      const selection = resolveRuleDocSelection(manifest, null);
      expect(selection.has('fca')).toBe(true);
      expect(selection.has('style')).toBe(false);
    });

    it('honours injected-rules for optional ids', () => {
      const config = createDefaultConfig();
      config['injected-rules'] = { style: true };
      const selection = resolveRuleDocSelection(manifest, config);
      expect(selection.has('fca')).toBe(true);
      expect(selection.has('style')).toBe(true);
    });

    it('excludes optional ids set to false', () => {
      const config = createDefaultConfig();
      config['injected-rules'] = { style: false };
      const selection = resolveRuleDocSelection(manifest, config);
      expect(selection.has('style')).toBe(false);
    });
  });

  // --- resolveGitRoot behavior (tested via loadConfig / initProject) ---

  describe('git root resolution', () => {
    it('resolves git root for subdirectory — initProject writes config at root', () => {
      const fakeGitRoot = join(tmpDir, 'repo');
      const subDir = join(fakeGitRoot, 'packages', 'sub');
      mkdirSync(subDir, { recursive: true });

      mockedExecSync.mockImplementation(((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse'))
          return fakeGitRoot + '\n';
        throw new Error('unexpected command');
      }) as typeof execSync);

      const result = initProject(subDir);
      expect(result.configCreated).toBe(true);
      expect(result.filePath.config).toBe(
        join(fakeGitRoot, '.filid', 'config.json'),
      );
      expect(existsSync(join(fakeGitRoot, '.filid', 'config.json'))).toBe(true);
    });

    it('loadConfig resolves git root — reads config written at repo root from subdirectory', () => {
      const fakeGitRoot = join(tmpDir, 'repo');
      const subDir = join(fakeGitRoot, 'packages', 'sub');
      mkdirSync(subDir, { recursive: true });

      mockedExecSync.mockImplementation(((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse'))
          return fakeGitRoot + '\n';
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
        if (typeof cmd === 'string' && cmd.includes('rev-parse'))
          return fakeGitRoot + '\n';
        throw new Error('unexpected command');
      }) as typeof execSync);

      // init from subdirectory writes config at repo root
      initProject(subDir);

      // loadRuleOverrides from same subdirectory should find it
      const overrides = loadRuleOverrides(subDir);
      expect(Object.keys(overrides)).toHaveLength(8);
    });

    it('falls back to provided path when git root cannot be determined', () => {
      mockedExecSync.mockImplementation((() => {
        throw new Error('not a git repository');
      }) as unknown as typeof execSync);

      const result = initProject(tmpDir);
      expect(result.configCreated).toBe(true);
      // Config should be at tmpDir itself (fallback)
      expect(result.filePath.config).toBe(
        join(tmpDir, '.filid', 'config.json'),
      );
    });

    it('caches git root resolution — execSync called once per unique path', () => {
      const fakeGitRoot = join(tmpDir, 'repo');
      const subDir = join(fakeGitRoot, 'packages', 'sub');
      mkdirSync(subDir, { recursive: true });

      mockedExecSync.mockImplementation(((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('rev-parse'))
          return fakeGitRoot + '\n';
        throw new Error('unexpected command');
      }) as typeof execSync);

      // Write config so loadConfig succeeds
      writeConfig(fakeGitRoot, createDefaultConfig());

      // Reset call history before measuring caching behavior
      mockedExecSync.mockClear();

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
