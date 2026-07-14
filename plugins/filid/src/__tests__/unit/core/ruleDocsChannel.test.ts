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

import { readSection } from '@ogham/cross-platform/instructions';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ruleDocMarkers } from '../../../constants/ruleDocs.js';
import { getRuleDocsStatus } from '../../../core/infra/configLoader/loaders/getRuleDocsStatus.js';
import { syncRuleDocs } from '../../../core/infra/configLoader/loaders/syncRuleDocs.js';

const REQUIRED_FILE = 'filid_fca-policy.md';
const OPTIONAL_FILE = 'filid_reuse-first.md';
const REQUIRED_BODY = '# FCA policy\n';
const OPTIONAL_BODY = '# Reuse first\n';

let projectRoot: string;
let pluginRoot: string;

const sha256 = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex');

/** The instruction file Codex reads — the only channel it has. */
const agentsMd = (): string => join(projectRoot, 'AGENTS.md');
const readAgentsMd = (): string => readFileSync(agentsMd(), 'utf8');

function writeTemplates(): void {
  const rulesDir = join(pluginRoot, 'templates', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(join(rulesDir, REQUIRED_FILE), REQUIRED_BODY, 'utf8');
  writeFileSync(join(rulesDir, OPTIONAL_FILE), OPTIONAL_BODY, 'utf8');
  writeFileSync(
    join(rulesDir, 'manifest.json'),
    JSON.stringify({
      version: '1.0',
      rules: [
        {
          id: 'filid_fca-policy',
          filename: REQUIRED_FILE,
          required: true,
          title: 'FCA',
          description: 'required',
          templateHash: sha256(REQUIRED_BODY),
        },
        {
          id: 'filid_reuse-first',
          filename: OPTIONAL_FILE,
          required: false,
          title: 'Reuse',
          description: 'optional',
          templateHash: sha256(OPTIONAL_BODY),
        },
      ],
    }),
    'utf8',
  );
}

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'filid-rule-channel-'));
  pluginRoot = mkdtempSync(join(tmpdir(), 'filid-rule-plugin-'));
  writeTemplates();
  process.env.OGHAM_HOST = 'codex';
});

afterEach(() => {
  delete process.env.OGHAM_HOST;
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(pluginRoot, { recursive: true, force: true });
});

describe('rule docs on the Codex channel', () => {
  it('merges rules into AGENTS.md — writing .claude/rules there is a silent no-op', () => {
    const result = syncRuleDocs(projectRoot, [], { pluginRoot });

    expect(result.copied).toContain(REQUIRED_FILE);
    expect(readSection(readAgentsMd(), ruleDocMarkers(REQUIRED_FILE))).toBe(
      REQUIRED_BODY.trim(),
    );
    expect(existsSync(join(projectRoot, '.claude', 'rules'))).toBe(false);
  });

  it('preserves what the user already wrote in AGENTS.md', () => {
    writeFileSync(agentsMd(), '# House rules\n', 'utf8');
    syncRuleDocs(projectRoot, [], { pluginRoot });

    expect(readAgentsMd()).toContain('# House rules');
  });

  it('does not stack a second copy when setup is run again', () => {
    syncRuleDocs(projectRoot, [], { pluginRoot });
    const once = readAgentsMd();

    const result = syncRuleDocs(projectRoot, [], { pluginRoot });

    expect(result.unchanged).toContain(REQUIRED_FILE);
    expect(readAgentsMd()).toBe(once);
  });

  it('holds both rule documents in the one file each with its own span', () => {
    syncRuleDocs(projectRoot, ['filid_reuse-first'], { pluginRoot });
    const content = readAgentsMd();

    expect(readSection(content, ruleDocMarkers(REQUIRED_FILE))).toBe(
      REQUIRED_BODY.trim(),
    );
    expect(readSection(content, ruleDocMarkers(OPTIONAL_FILE))).toBe(
      OPTIONAL_BODY.trim(),
    );
  });

  it('removes a deselected rule without disturbing the one that stays', () => {
    syncRuleDocs(projectRoot, ['filid_reuse-first'], { pluginRoot });

    const result = syncRuleDocs(projectRoot, [], { pluginRoot });

    expect(result.removed).toContain(OPTIONAL_FILE);
    const content = readAgentsMd();
    expect(readSection(content, ruleDocMarkers(OPTIONAL_FILE))).toBeNull();
    expect(readSection(content, ruleDocMarkers(REQUIRED_FILE))).toBe(
      REQUIRED_BODY.trim(),
    );
  });

  it('reports a hand-edited optional section as drift instead of overwriting it', () => {
    syncRuleDocs(projectRoot, ['filid_reuse-first'], { pluginRoot });
    writeFileSync(
      agentsMd(),
      readAgentsMd().replace('# Reuse first', '# Reuse first (edited)'),
      'utf8',
    );

    const result = syncRuleDocs(projectRoot, ['filid_reuse-first'], {
      pluginRoot,
    });

    expect(result.drift).toContain(OPTIONAL_FILE);
    expect(readAgentsMd()).toContain('# Reuse first (edited)');
  });

  it('overwrites that section once the caller asks for a resync', () => {
    syncRuleDocs(projectRoot, ['filid_reuse-first'], { pluginRoot });
    writeFileSync(
      agentsMd(),
      readAgentsMd().replace('# Reuse first', '# Reuse first (edited)'),
      'utf8',
    );

    const result = syncRuleDocs(projectRoot, ['filid_reuse-first'], {
      pluginRoot,
      resync: ['filid_reuse-first'],
    });

    expect(result.updated).toContain(OPTIONAL_FILE);
    expect(readSection(readAgentsMd(), ruleDocMarkers(OPTIONAL_FILE))).toBe(
      OPTIONAL_BODY.trim(),
    );
  });

  it('auto-updates a drifted required rule, as it does on the directory channel', () => {
    syncRuleDocs(projectRoot, [], { pluginRoot });
    writeFileSync(
      agentsMd(),
      readAgentsMd().replace('# FCA policy', '# FCA policy (edited)'),
      'utf8',
    );

    const result = syncRuleDocs(projectRoot, [], { pluginRoot });

    expect(result.updated).toContain(REQUIRED_FILE);
    expect(readSection(readAgentsMd(), ruleDocMarkers(REQUIRED_FILE))).toBe(
      REQUIRED_BODY.trim(),
    );
  });

  it('reads its status back out of the merged file', () => {
    syncRuleDocs(projectRoot, ['filid_reuse-first'], { pluginRoot });

    const status = getRuleDocsStatus(projectRoot, pluginRoot);

    expect(status.autoDeployed[0]?.deployed).toBe(true);
    expect(status.autoDeployed[0]?.inSync).toBe(true);
    expect(status.entries[0]?.deployed).toBe(true);
    expect(status.entries[0]?.selected).toBe(true);
  });

  it('reports nothing deployed before the first sync', () => {
    const status = getRuleDocsStatus(projectRoot, pluginRoot);

    expect(status.autoDeployed[0]?.deployed).toBe(false);
    expect(status.autoDeployed[0]?.deployedHash).toBeNull();
    expect(status.entries[0]?.selected).toBe(false);
  });

  it('sees a hand-edited section as out of sync', () => {
    syncRuleDocs(projectRoot, [], { pluginRoot });
    writeFileSync(
      agentsMd(),
      readAgentsMd().replace('# FCA policy', '# FCA policy (edited)'),
      'utf8',
    );

    const status = getRuleDocsStatus(projectRoot, pluginRoot);

    expect(status.autoDeployed[0]?.deployed).toBe(true);
    expect(status.autoDeployed[0]?.inSync).toBe(false);
  });

  it('keeps Claude on the directory channel — the branch must not leak across hosts', () => {
    delete process.env.OGHAM_HOST;

    const result = syncRuleDocs(projectRoot, [], { pluginRoot });

    expect(result.copied).toContain(REQUIRED_FILE);
    expect(
      existsSync(join(projectRoot, '.claude', 'rules', REQUIRED_FILE)),
    ).toBe(true);
    expect(existsSync(agentsMd())).toBe(false);
  });
});
