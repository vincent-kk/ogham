import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getRuleDocsStatus } from '../../../core/infra/configLoader/loaders/getRuleDocsStatus.js';
import { syncRuleDocs } from '../../../core/infra/configLoader/loaders/syncRuleDocs.js';

const CURRENT_FILE = 'filid_optional.md';
const LEGACY_FILE = 'optional.md';
const TEMPLATE = '# Expected\n';

const sha256 = (content: string): string =>
  createHash('sha256').update(content).digest('hex');

describe('rule document compatibility', () => {
  let projectRoot: string;
  let pluginRoot: string;
  let originalHost: string | undefined;
  let originalPluginData: string | undefined;
  let originalAgySignal: string | undefined;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'filid-rule-compat-project-'));
    pluginRoot = mkdtempSync(join(tmpdir(), 'filid-rule-compat-plugin-'));
    originalHost = process.env.OGHAM_HOST;
    originalPluginData = process.env.PLUGIN_DATA;
    originalAgySignal = process.env.ANTIGRAVITY_CONVERSATION_ID;
    delete process.env.OGHAM_HOST;
    delete process.env.PLUGIN_DATA;
    delete process.env.ANTIGRAVITY_CONVERSATION_ID;
    mkdirSync(join(pluginRoot, 'templates', 'rules'), { recursive: true });
  });

  afterEach(() => {
    restoreEnv('OGHAM_HOST', originalHost);
    restoreEnv('PLUGIN_DATA', originalPluginData);
    restoreEnv('ANTIGRAVITY_CONVERSATION_ID', originalAgySignal);
    rmSync(projectRoot, { recursive: true, force: true });
    rmSync(pluginRoot, { recursive: true, force: true });
  });

  it('degrades an unreadable template to the established empty status shape', () => {
    writeManifest([
      manifestEntry('required', 'filid_required.md', true),
      manifestEntry('optional', CURRENT_FILE, false),
    ]);
    mkdirSync(join(pluginRoot, 'templates', 'rules', 'filid_required.md'));
    writeFileSync(
      join(pluginRoot, 'templates', 'rules', CURRENT_FILE),
      TEMPLATE,
    );

    const status = getRuleDocsStatus(projectRoot, pluginRoot);

    expect(status).toEqual({
      entries: [],
      autoDeployed: [],
      pluginRootResolved: true,
      manifestPath: join(pluginRoot, 'templates', 'rules', 'manifest.json'),
    });
  });

  it('preserves the directory hash invariant when a template is missing', () => {
    writeManifest([manifestEntry('optional', CURRENT_FILE, false)]);
    const rulesDirectory = join(projectRoot, '.claude', 'rules');
    mkdirSync(rulesDirectory, { recursive: true });
    writeFileSync(join(rulesDirectory, CURRENT_FILE), TEMPLATE);

    const entry = getRuleDocsStatus(projectRoot, pluginRoot).entries[0];

    expect(entry?.templateHash).toBe(sha256(TEMPLATE));
    expect(entry?.deployedHash).toBe(sha256(TEMPLATE));
    expect(entry?.inSync).toBe(true);
  });

  it('relocates legacy optional drift without changing its bytes', () => {
    writeManifest([
      {
        ...manifestEntry('optional', CURRENT_FILE, false),
        legacyFilename: LEGACY_FILE,
      },
    ]);
    writeFileSync(
      join(pluginRoot, 'templates', 'rules', CURRENT_FILE),
      TEMPLATE,
    );
    const rulesDirectory = join(projectRoot, '.claude', 'rules');
    mkdirSync(rulesDirectory, { recursive: true });
    const edited = '# User edit\n';
    writeFileSync(join(rulesDirectory, LEGACY_FILE), edited);

    const result = syncRuleDocs(projectRoot, ['optional'], { pluginRoot });

    expect(result.drift).toContain(CURRENT_FILE);
    expect(result.updated).not.toContain(CURRENT_FILE);
    expect(existsSync(join(rulesDirectory, LEGACY_FILE))).toBe(false);
    expect(readFileSync(join(rulesDirectory, CURRENT_FILE), 'utf8')).toBe(
      edited,
    );
  });

  function writeManifest(rules: object[]): void {
    writeFileSync(
      join(pluginRoot, 'templates', 'rules', 'manifest.json'),
      JSON.stringify({ version: '1.0', rules }),
    );
  }

  function manifestEntry(
    id: string,
    filename: string,
    required: boolean,
  ): object {
    return {
      id,
      filename,
      required,
      title: id,
      description: `${id} fixture`,
      templateHash: sha256(TEMPLATE),
    };
  }
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
