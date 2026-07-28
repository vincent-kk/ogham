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

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getRuleDocsStatus,
  syncRuleDocs,
} from '../../../core/infra/configLoader/configLoader.js';

const REQUIRED_ID = 'filid_fractal-boundaries';
const REQUIRED_FILE = 'filid_fractal-boundaries.md';
const LEGACY_FILE = 'filid_fca-policy.md';
const REQUIRED_CONTENT = '# FCA Rules Template';

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

describe('config rule-document management', () => {
  let tmpDir: string;
  let originalPluginRoot: string | undefined;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `filid-rule-docs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
    originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  });

  afterEach(() => {
    if (originalPluginRoot === undefined) delete process.env.CLAUDE_PLUGIN_ROOT;
    else process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function setupPluginRoot(optionalIds: string[] = []): string {
    const pluginRoot = join(tmpDir, 'plugin');
    const templates = join(pluginRoot, 'templates', 'rules');
    mkdirSync(templates, { recursive: true });
    writeFileSync(join(templates, REQUIRED_FILE), REQUIRED_CONTENT, 'utf8');
    const optionalContent = Object.fromEntries(
      optionalIds.map((id) => [id, `# ${id} template`]),
    );
    for (const [id, content] of Object.entries(optionalContent))
      writeFileSync(join(templates, `${id}.md`), content, 'utf8');
    writeFileSync(
      join(templates, 'manifest.json'),
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
            templateHash: sha256(REQUIRED_CONTENT),
          },
          ...optionalIds.map((id) => ({
            id,
            filename: `${id}.md`,
            required: false,
            title: `${id} rules`,
            description: `optional ${id}`,
            templateHash: sha256(optionalContent[id]),
          })),
        ],
      }),
      'utf8',
    );
    return pluginRoot;
  }

  function writeDeployed(filename: string, content: string): void {
    const target = join(tmpDir, '.claude', 'rules');
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, filename), content, 'utf8');
  }

  it('deploys the required document regardless of selection', () => {
    const pluginRoot = setupPluginRoot();

    const result = syncRuleDocs(tmpDir, [], { pluginRoot });

    expect(result.copied).toContain(REQUIRED_FILE);
    expect(existsSync(join(tmpDir, '.claude', 'rules', REQUIRED_FILE))).toBe(
      true,
    );
  });

  it('keeps matching deployed content unchanged', () => {
    const pluginRoot = setupPluginRoot();
    writeDeployed(REQUIRED_FILE, REQUIRED_CONTENT);

    const result = syncRuleDocs(tmpDir, [], { pluginRoot });

    expect(result.unchanged).toContain(REQUIRED_FILE);
    expect(result.copied).not.toContain(REQUIRED_FILE);
  });

  it('auto-updates required document drift', () => {
    const pluginRoot = setupPluginRoot();
    writeDeployed(REQUIRED_FILE, '# local edit');

    const result = syncRuleDocs(tmpDir, [], { pluginRoot });

    expect(result.updated).toContain(REQUIRED_FILE);
    expect(result.drift).not.toContain(REQUIRED_FILE);
    expect(
      readFileSync(join(tmpDir, '.claude', 'rules', REQUIRED_FILE), 'utf8'),
    ).toBe(REQUIRED_CONTENT);
  });

  it('copies a selected optional document', () => {
    const pluginRoot = setupPluginRoot(['extra']);

    const result = syncRuleDocs(tmpDir, ['extra'], { pluginRoot });

    expect(result.copied).toContain('extra.md');
  });

  it('removes an unselected optional document', () => {
    const pluginRoot = setupPluginRoot(['extra']);
    syncRuleDocs(tmpDir, ['extra'], { pluginRoot });

    const result = syncRuleDocs(tmpDir, [], { pluginRoot });

    expect(result.removed).toContain('extra.md');
    expect(existsSync(join(tmpDir, '.claude', 'rules', 'extra.md'))).toBe(
      false,
    );
    expect(existsSync(join(tmpDir, '.claude', 'rules', REQUIRED_FILE))).toBe(
      true,
    );
  });

  it('returns a skipped reason when plugin root is unavailable', () => {
    delete process.env.CLAUDE_PLUGIN_ROOT;

    const result = syncRuleDocs(tmpDir, [REQUIRED_ID]);

    expect(result.skipped).toContainEqual(expect.objectContaining({ id: '*' }));
  });

  it('renames a matching legacy required document', () => {
    const pluginRoot = setupPluginRoot();
    writeDeployed(LEGACY_FILE, REQUIRED_CONTENT);

    const result = syncRuleDocs(tmpDir, [], { pluginRoot });

    expect(existsSync(join(tmpDir, '.claude', 'rules', LEGACY_FILE))).toBe(
      false,
    );
    expect(result.unchanged).toContain(REQUIRED_FILE);
  });

  it('updates a drifted legacy required document after renaming it', () => {
    const pluginRoot = setupPluginRoot();
    writeDeployed(LEGACY_FILE, '# legacy local edit');

    const result = syncRuleDocs(tmpDir, [], { pluginRoot });

    expect(existsSync(join(tmpDir, '.claude', 'rules', LEGACY_FILE))).toBe(
      false,
    );
    expect(result.updated).toContain(REQUIRED_FILE);
  });

  it('skips a selected document whose template file is missing', () => {
    const pluginRoot = setupPluginRoot();
    writeFileSync(
      join(pluginRoot, 'templates', 'rules', 'manifest.json'),
      JSON.stringify({
        version: '1.0',
        rules: [
          {
            id: 'ghost',
            filename: 'ghost.md',
            required: false,
            title: 'Ghost',
            description: 'Missing template',
            templateHash: sha256('never written'),
          },
        ],
      }),
      'utf8',
    );

    const result = syncRuleDocs(tmpDir, ['ghost'], { pluginRoot });

    expect(result.skipped).toContainEqual(
      expect.objectContaining({ id: 'ghost' }),
    );
  });

  it('rejects a manifest entry without a template hash', () => {
    const pluginRoot = setupPluginRoot();
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
            description: 'Missing hash',
          },
        ],
      }),
      'utf8',
    );

    const result = syncRuleDocs(tmpDir, [], { pluginRoot });

    expect(result.skipped[0]).toEqual(expect.objectContaining({ id: '*' }));
    expect(result.skipped[0]?.reason).toContain('templateHash');
  });

  it('does not classify matching deployed content as updated or drifted', () => {
    const pluginRoot = setupPluginRoot();
    writeDeployed(REQUIRED_FILE, REQUIRED_CONTENT);

    const result = syncRuleDocs(tmpDir, [], { pluginRoot });

    expect(result.unchanged).toContain(REQUIRED_FILE);
    expect(result.updated).not.toContain(REQUIRED_FILE);
    expect(result.drift).not.toContain(REQUIRED_FILE);
  });

  it('updates required drift without a resync opt-in', () => {
    const pluginRoot = setupPluginRoot();
    writeDeployed(REQUIRED_FILE, '# outdated');

    const result = syncRuleDocs(tmpDir, [], { pluginRoot });

    expect(result.updated).toContain(REQUIRED_FILE);
    expect(result.drift).not.toContain(REQUIRED_FILE);
  });

  it('reports and preserves optional drift without resync', () => {
    const pluginRoot = setupPluginRoot(['extra']);
    writeDeployed(REQUIRED_FILE, REQUIRED_CONTENT);
    writeDeployed('extra.md', '# user edit');

    const result = syncRuleDocs(tmpDir, ['extra'], { pluginRoot });

    expect(result.drift).toContain('extra.md');
    expect(result.updated).not.toContain('extra.md');
    expect(
      readFileSync(join(tmpDir, '.claude', 'rules', 'extra.md'), 'utf8'),
    ).toBe('# user edit');
  });

  it('overwrites optional drift only with resync opt-in', () => {
    const pluginRoot = setupPluginRoot(['extra']);
    writeDeployed(REQUIRED_FILE, REQUIRED_CONTENT);
    writeDeployed('extra.md', '# user edit');

    const result = syncRuleDocs(tmpDir, ['extra'], {
      pluginRoot,
      resync: ['extra'],
    });

    expect(result.updated).toContain('extra.md');
    expect(result.drift).not.toContain('extra.md');
    expect(
      readFileSync(join(tmpDir, '.claude', 'rules', 'extra.md'), 'utf8'),
    ).toBe('# extra template');
  });

  it('separates required and optional status entries', () => {
    const pluginRoot = setupPluginRoot(['extra']);
    writeDeployed(REQUIRED_FILE, '# deployed');

    const status = getRuleDocsStatus(tmpDir, pluginRoot);

    expect(status.pluginRootResolved).toBe(true);
    expect(status.autoDeployed).toContainEqual(
      expect.objectContaining({
        id: REQUIRED_ID,
        required: true,
        deployed: true,
        selected: true,
      }),
    );
    expect(status.entries).toContainEqual(
      expect.objectContaining({
        id: 'extra',
        required: false,
        deployed: false,
        selected: false,
      }),
    );
  });

  it('selects an optional status entry when its file is deployed', () => {
    const pluginRoot = setupPluginRoot(['extra']);
    writeDeployed('extra.md', '# deployed');

    const status = getRuleDocsStatus(tmpDir, pluginRoot);

    expect(status.entries).toContainEqual(
      expect.objectContaining({
        id: 'extra',
        deployed: true,
        selected: true,
      }),
    );
  });

  it('reports an unresolved plugin root with empty status lists', () => {
    delete process.env.CLAUDE_PLUGIN_ROOT;

    expect(getRuleDocsStatus(tmpDir)).toEqual({
      pluginRootResolved: false,
      manifestPath: null,
      entries: [],
      autoDeployed: [],
    });
  });

  it('reports template and deployed hashes for sync and drift', () => {
    const pluginRoot = setupPluginRoot(['extra']);
    writeDeployed(REQUIRED_FILE, REQUIRED_CONTENT);
    writeDeployed('extra.md', '# tampered');

    const status = getRuleDocsStatus(tmpDir, pluginRoot);
    const required = status.autoDeployed.find(
      (entry) => entry.id === REQUIRED_ID,
    );
    const extra = status.entries.find((entry) => entry.id === 'extra');

    expect(required).toMatchObject({
      templateHash: sha256(REQUIRED_CONTENT),
      deployedHash: sha256(REQUIRED_CONTENT),
      inSync: true,
    });
    expect(extra).toMatchObject({
      templateHash: sha256('# extra template'),
      deployedHash: sha256('# tampered'),
      inSync: false,
    });
  });

  it('reports null deployed hashes for missing documents', () => {
    const status = getRuleDocsStatus(tmpDir, setupPluginRoot(['extra']));

    for (const entry of [...status.entries, ...status.autoDeployed]) {
      expect(entry.deployed).toBe(false);
      expect(entry.deployedHash).toBeNull();
      expect(entry.inSync).toBe(false);
    }
  });
});
