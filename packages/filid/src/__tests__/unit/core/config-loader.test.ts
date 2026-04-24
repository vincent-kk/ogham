import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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

function sha256Hex(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

import {
  createDefaultConfig,
  getRuleDocsStatus,
  initProject,
  loadConfig,
  loadRuleOverrides,
  resolveLanguage,
  resolveMaxDepth,
  syncRuleDocs,
  writeConfig,
} from '../../../core/infra/config-loader/config-loader.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../constants/scan-defaults.js';
import { BUILTIN_RULE_IDS } from '../../../constants/builtin-rule-ids.js';

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
    const { config, warnings } = loadConfig(tmpDir);
    expect(config).toBeNull();
    expect(warnings).toEqual([]);
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
    const { config: loaded } = loadConfig(tmpDir);
    expect(loaded).toEqual(config);
  });

  it('loadConfig returns null for invalid JSON', () => {
    const configDir = join(tmpDir, '.filid');
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, 'config.json'), 'not-json', 'utf8');
    const { config, warnings } = loadConfig(tmpDir);
    expect(config).toBeNull();
    expect(warnings.length).toBeGreaterThan(0);
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
    const { config: loaded } = loadConfig(tmpDir);
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
      const { config: loaded } = loadConfig(tmpDir);
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
      const { config: loaded, warnings } = loadConfig(tmpDir);
      expect(loaded).not.toBeNull();
      expect(loaded?.scan?.maxDepth).toBeUndefined();
      expect(resolveMaxDepth(loaded)).toBe(DEFAULT_SCAN_OPTIONS.maxDepth);
      expect(warnings.some((w) => w.includes('maxDepth'))).toBe(true);
    });

    it('loadConfig strips non-numeric scan.maxDepth', () => {
      writeRawConfig({
        version: '1.0',
        rules: {},
        scan: { maxDepth: 'deep' },
      });
      const { config: loaded, warnings } = loadConfig(tmpDir);
      expect(loaded?.scan?.maxDepth).toBeUndefined();
      expect(warnings.some((w) => w.includes('maxDepth'))).toBe(true);
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
      const { config: loaded } = loadConfig(tmpDir);
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
      const { config: loaded } = loadConfig(tmpDir);
      expect(loaded?.rules['naming-convention']?.enabled).toBe(false);
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
    const REQUIRED_ID = 'filid_fca-policy';
    const REQUIRED_FILE = 'filid_fca-policy.md';
    const LEGACY_FILE = 'fca.md';

    function setupFakePluginRoot(extraRuleFiles: string[] = []): string {
      const pluginRoot = join(tmpDir, 'plugin');
      mkdirSync(join(pluginRoot, 'templates', 'rules'), { recursive: true });
      const requiredContent = '# FCA Rules Template';
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', REQUIRED_FILE),
        requiredContent,
        'utf8',
      );
      const extraContent: Record<string, string> = {};
      for (const name of extraRuleFiles) {
        extraContent[name] = `# ${name} template`;
        writeFileSync(
          join(pluginRoot, 'templates', 'rules', `${name}.md`),
          extraContent[name],
          'utf8',
        );
      }
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'manifest.json'),
        JSON.stringify({
          version: '1.0',
          rules: [
            {
              id: REQUIRED_ID,
              filename: REQUIRED_FILE,
              legacyFilename: LEGACY_FILE,
              required: true,
              title: 'FCA-AI Architecture Rules',
              description: 'Mandatory FCA rules',
              templateHash: sha256Hex(requiredContent),
            },
            ...extraRuleFiles.map((name) => ({
              id: name,
              filename: `${name}.md`,
              required: false,
              title: `${name} rules`,
              description: `optional ${name}`,
              templateHash: sha256Hex(extraContent[name]),
            })),
          ],
        }),
        'utf8',
      );
      return pluginRoot;
    }

    it('deploys required rule doc regardless of selection', () => {
      const pluginRoot = setupFakePluginRoot();
      const result = syncRuleDocs(tmpDir, [], { pluginRoot });
      expect(result.copied).toContain(REQUIRED_FILE);
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', REQUIRED_FILE)),
      ).toBe(true);
    });

    it('preserves existing files when content matches template', () => {
      const pluginRoot = setupFakePluginRoot();
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.claude', 'rules', REQUIRED_FILE),
        '# FCA Rules Template',
        'utf8',
      );
      const result = syncRuleDocs(tmpDir, [], { pluginRoot });
      expect(result.copied).not.toContain(REQUIRED_FILE);
      expect(result.unchanged).toContain(REQUIRED_FILE);
      const content = readFileSync(
        join(tmpDir, '.claude', 'rules', REQUIRED_FILE),
        'utf8',
      );
      expect(content).toBe('# FCA Rules Template');
    });

    it('auto-updates required rule when local content differs from template', () => {
      const pluginRoot = setupFakePluginRoot();
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.claude', 'rules', REQUIRED_FILE),
        '# Custom user edits',
        'utf8',
      );
      const result = syncRuleDocs(tmpDir, [], { pluginRoot });
      // Required rules auto-resync on drift regardless of user input.
      expect(result.updated).toContain(REQUIRED_FILE);
      expect(result.drift).not.toContain(REQUIRED_FILE);
      const content = readFileSync(
        join(tmpDir, '.claude', 'rules', REQUIRED_FILE),
        'utf8',
      );
      expect(content).toBe('# FCA Rules Template');
    });

    it('copies optional rule doc when selected', () => {
      const pluginRoot = setupFakePluginRoot(['extra']);
      const result = syncRuleDocs(tmpDir, ['extra'], { pluginRoot });
      expect(result.copied).toContain('extra.md');
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', 'extra.md')),
      ).toBe(true);
    });

    it('removes optional rule doc when unselected', () => {
      const pluginRoot = setupFakePluginRoot(['extra']);
      // First deploy
      syncRuleDocs(tmpDir, ['extra'], { pluginRoot });
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', 'extra.md')),
      ).toBe(true);
      // Then unselect
      const result = syncRuleDocs(tmpDir, [], { pluginRoot });
      expect(result.removed).toContain('extra.md');
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', 'extra.md')),
      ).toBe(false);
      // Required rule is still there
      expect(
        existsSync(join(tmpDir, '.claude', 'rules', REQUIRED_FILE)),
      ).toBe(true);
    });

    it('skips with error reason when pluginRoot cannot be resolved', () => {
      const origEnv = process.env.CLAUDE_PLUGIN_ROOT;
      delete process.env.CLAUDE_PLUGIN_ROOT;
      try {
        const result = syncRuleDocs(tmpDir, [REQUIRED_ID]);
        expect(result.skipped.length).toBe(1);
        expect(result.skipped[0].id).toBe('*');
      } finally {
        if (origEnv) process.env.CLAUDE_PLUGIN_ROOT = origEnv;
      }
    });

    it('migrates legacy filename to new name during sync', () => {
      const pluginRoot = setupFakePluginRoot();
      // Simulate a project that was set up with the old filename. Use the
      // template's exact content so the migrated file is in-sync and the
      // assertion isolates rename behaviour from drift auto-update.
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.claude', 'rules', LEGACY_FILE),
        '# FCA Rules Template',
        'utf8',
      );
      const result = syncRuleDocs(tmpDir, [], { pluginRoot });
      // Legacy file should have been renamed, not overwritten
      expect(existsSync(join(tmpDir, '.claude', 'rules', LEGACY_FILE))).toBe(false);
      expect(existsSync(join(tmpDir, '.claude', 'rules', REQUIRED_FILE))).toBe(true);
      // Content preserved (rename is metadata-only; no drift)
      const content = readFileSync(
        join(tmpDir, '.claude', 'rules', REQUIRED_FILE),
        'utf8',
      );
      expect(content).toBe('# FCA Rules Template');
      // Treated as unchanged (already deployed under new name after migration)
      expect(result.unchanged).toContain(REQUIRED_FILE);
    });

    it('migrated legacy file with drift auto-updates (required rule)', () => {
      const pluginRoot = setupFakePluginRoot();
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.claude', 'rules', LEGACY_FILE),
        '# User-customized FCA rules',
        'utf8',
      );
      const result = syncRuleDocs(tmpDir, [], { pluginRoot });
      // Legacy file renamed, then drift detected → required auto-update.
      expect(existsSync(join(tmpDir, '.claude', 'rules', LEGACY_FILE))).toBe(false);
      expect(result.updated).toContain(REQUIRED_FILE);
      const content = readFileSync(
        join(tmpDir, '.claude', 'rules', REQUIRED_FILE),
        'utf8',
      );
      expect(content).toBe('# FCA Rules Template');
    });

    it('skips individual rule when template file is missing', () => {
      const pluginRoot = setupFakePluginRoot();
      // Point manifest at a file that doesn't exist. templateHash is
      // synthetic — the manifest itself is valid, but the referenced file
      // has never been written so the sync must record a skip.
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
              templateHash: sha256Hex('never-written'),
            },
          ],
        }),
        'utf8',
      );
      const result = syncRuleDocs(tmpDir, ['ghost'], { pluginRoot });
      expect(result.skipped.some((s) => s.id === 'ghost')).toBe(true);
    });

    it('throws manifest shape error when an entry is missing templateHash', () => {
      const pluginRoot = setupFakePluginRoot();
      // Write a manifest without templateHash on any entry to simulate a
      // plugin build that forgot to run scripts/sync-rule-hashes.mjs.
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'manifest.json'),
        JSON.stringify({
          version: '1.0',
          rules: [
            {
              id: REQUIRED_ID,
              filename: REQUIRED_FILE,
              required: true,
              title: 'FCA',
              description: 'stale manifest without templateHash',
            },
          ],
        }),
        'utf8',
      );
      const result = syncRuleDocs(tmpDir, [], { pluginRoot });
      expect(result.skipped.some((s) => s.id === '*')).toBe(true);
      expect(
        result.skipped[0]?.reason.includes('templateHash'),
      ).toBe(true);
    });

    describe('drift detection', () => {
      function writeDeployed(filename: string, content: string): void {
        mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
        writeFileSync(
          join(tmpDir, '.claude', 'rules', filename),
          content,
          'utf8',
        );
      }

      it('in-sync deployed file lands in `unchanged`', () => {
        const pluginRoot = setupFakePluginRoot();
        writeDeployed(REQUIRED_FILE, '# FCA Rules Template');
        const result = syncRuleDocs(tmpDir, [], { pluginRoot });
        expect(result.unchanged).toContain(REQUIRED_FILE);
        expect(result.updated).not.toContain(REQUIRED_FILE);
        expect(result.drift).not.toContain(REQUIRED_FILE);
      });

      it('required drift is auto-updated without resync opt-in', () => {
        const pluginRoot = setupFakePluginRoot();
        writeDeployed(REQUIRED_FILE, '# outdated');
        const result = syncRuleDocs(tmpDir, [], { pluginRoot });
        expect(result.updated).toContain(REQUIRED_FILE);
        expect(result.drift).not.toContain(REQUIRED_FILE);
        const content = readFileSync(
          join(tmpDir, '.claude', 'rules', REQUIRED_FILE),
          'utf8',
        );
        expect(content).toBe('# FCA Rules Template');
      });

      it('optional drift without resync is reported and preserved', () => {
        const pluginRoot = setupFakePluginRoot(['extra']);
        writeDeployed(REQUIRED_FILE, '# FCA Rules Template');
        writeDeployed('extra.md', '# user edits');
        const result = syncRuleDocs(tmpDir, ['extra'], { pluginRoot });
        expect(result.drift).toContain('extra.md');
        expect(result.updated).not.toContain('extra.md');
        // User edits are preserved.
        const content = readFileSync(
          join(tmpDir, '.claude', 'rules', 'extra.md'),
          'utf8',
        );
        expect(content).toBe('# user edits');
      });

      it('optional drift with resync opt-in is overwritten', () => {
        const pluginRoot = setupFakePluginRoot(['extra']);
        writeDeployed(REQUIRED_FILE, '# FCA Rules Template');
        writeDeployed('extra.md', '# user edits');
        const result = syncRuleDocs(tmpDir, ['extra'], {
          pluginRoot,
          resync: ['extra'],
        });
        expect(result.updated).toContain('extra.md');
        expect(result.drift).not.toContain('extra.md');
        const content = readFileSync(
          join(tmpDir, '.claude', 'rules', 'extra.md'),
          'utf8',
        );
        expect(content).toBe('# extra template');
      });
    });
  });

  describe('getRuleDocsStatus', () => {
    const STATUS_REQUIRED_ID = 'filid_fca-policy';
    const STATUS_REQUIRED_FILE = 'filid_fca-policy.md';

    function setupStatusPluginRoot(): string {
      const pluginRoot = join(tmpDir, 'plugin');
      mkdirSync(join(pluginRoot, 'templates', 'rules'), { recursive: true });
      const fcaContent = '# FCA';
      const extraContent = '# Extra';
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', STATUS_REQUIRED_FILE),
        fcaContent,
        'utf8',
      );
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'extra.md'),
        extraContent,
        'utf8',
      );
      writeFileSync(
        join(pluginRoot, 'templates', 'rules', 'manifest.json'),
        JSON.stringify({
          version: '1.0',
          rules: [
            {
              id: STATUS_REQUIRED_ID,
              filename: STATUS_REQUIRED_FILE,
              required: true,
              title: 'FCA',
              description: 'required',
              templateHash: sha256Hex(fcaContent),
            },
            {
              id: 'extra',
              filename: 'extra.md',
              required: false,
              title: 'Extra',
              description: 'optional',
              templateHash: sha256Hex(extraContent),
            },
          ],
        }),
        'utf8',
      );
      return pluginRoot;
    }

    it('returns entries with deployed/selected flags', () => {
      const pluginRoot = setupStatusPluginRoot();

      // deploy required rule only — filesystem is the single source of truth.
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.claude', 'rules', STATUS_REQUIRED_FILE),
        '# Deployed FCA',
        'utf8',
      );

      const status = getRuleDocsStatus(tmpDir, pluginRoot);
      expect(status.pluginRootResolved).toBe(true);
      // entries contains optional rules only — required rules live in
      // `autoDeployed` and are never rendered in the checkbox UI.
      expect(status.entries).toHaveLength(1);
      expect(status.autoDeployed).toHaveLength(1);

      const fca = status.autoDeployed.find((e) => e.id === STATUS_REQUIRED_ID);
      expect(fca).toBeDefined();
      expect(fca!.required).toBe(true);
      expect(fca!.deployed).toBe(true);
      expect(fca!.selected).toBe(true); // required → always selected

      // Required entry must NOT leak into the checkbox-facing list.
      expect(status.entries.find((e) => e.id === STATUS_REQUIRED_ID)).toBeUndefined();

      const extra = status.entries.find((e) => e.id === 'extra');
      expect(extra).toBeDefined();
      expect(extra!.required).toBe(false);
      expect(extra!.deployed).toBe(false);
      expect(extra!.selected).toBe(false); // not deployed → not selected
    });

    it('marks an optional entry as selected when its file is deployed', () => {
      const pluginRoot = setupStatusPluginRoot();

      // Deploy both files — optional entry should light up via filesystem.
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      writeFileSync(
        join(tmpDir, '.claude', 'rules', STATUS_REQUIRED_FILE),
        '# Deployed FCA',
        'utf8',
      );
      writeFileSync(
        join(tmpDir, '.claude', 'rules', 'extra.md'),
        '# Deployed Extra',
        'utf8',
      );

      const status = getRuleDocsStatus(tmpDir, pluginRoot);
      const extra = status.entries.find((e) => e.id === 'extra');
      expect(extra!.deployed).toBe(true);
      expect(extra!.selected).toBe(true);
    });

    it('returns pluginRootResolved=false when env is unset and no arg', () => {
      const origEnv = process.env.CLAUDE_PLUGIN_ROOT;
      delete process.env.CLAUDE_PLUGIN_ROOT;
      try {
        const status = getRuleDocsStatus(tmpDir);
        expect(status.pluginRootResolved).toBe(false);
        expect(status.entries).toEqual([]);
        expect(status.autoDeployed).toEqual([]);
      } finally {
        if (origEnv) process.env.CLAUDE_PLUGIN_ROOT = origEnv;
      }
    });

    it('populates templateHash/deployedHash/inSync for all states', () => {
      const pluginRoot = setupStatusPluginRoot();
      mkdirSync(join(tmpDir, '.claude', 'rules'), { recursive: true });
      // Required deployed with exact template content → inSync true.
      writeFileSync(
        join(tmpDir, '.claude', 'rules', STATUS_REQUIRED_FILE),
        '# FCA',
        'utf8',
      );
      // Optional deployed with edited content → drift.
      writeFileSync(
        join(tmpDir, '.claude', 'rules', 'extra.md'),
        '# tampered',
        'utf8',
      );

      const status = getRuleDocsStatus(tmpDir, pluginRoot);
      const fca = status.autoDeployed.find((e) => e.id === STATUS_REQUIRED_ID);
      expect(fca).toBeDefined();
      expect(fca!.templateHash).toBe(sha256Hex('# FCA'));
      expect(fca!.deployedHash).toBe(sha256Hex('# FCA'));
      expect(fca!.inSync).toBe(true);

      const extra = status.entries.find((e) => e.id === 'extra');
      expect(extra).toBeDefined();
      expect(extra!.templateHash).toBe(sha256Hex('# Extra'));
      expect(extra!.deployedHash).toBe(sha256Hex('# tampered'));
      expect(extra!.inSync).toBe(false);
    });

    it('marks undeployed entries with deployedHash=null and inSync=false', () => {
      const pluginRoot = setupStatusPluginRoot();
      // Nothing deployed — both entries should report missing state.
      const status = getRuleDocsStatus(tmpDir, pluginRoot);
      for (const entry of [...status.entries, ...status.autoDeployed]) {
        expect(entry.deployed).toBe(false);
        expect(entry.deployedHash).toBeNull();
        expect(entry.inSync).toBe(false);
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
      const { config } = loadConfig(subDir);
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
