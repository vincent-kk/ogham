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

import { resolveFilidRuleTarget } from '../../../core/infra/configLoader/loaders/resolveFilidRuleTarget.js';
import { syncRuleDocs } from '../../../core/infra/configLoader/loaders/syncRuleDocs.js';

const REQUIRED_FILE = 'filid_fractal-boundaries.md';
const REQUIRED_BODY = '# FCA policy\n';
const FOREIGN_FILE = 'seiri_reuse-first.md';

let projectRoot: string;
let pluginRoot: string;

const sha256 = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex');

/** The layer-specific directories the two channels resolve to. */
const userRulesDir = (): string =>
  join(process.env.CLAUDE_CONFIG_DIR ?? '', 'rules');
const projectRulesDir = (): string => join(projectRoot, '.claude', 'rules');

function writeTemplates(): void {
  const rulesDir = join(pluginRoot, 'templates', 'rules');
  mkdirSync(rulesDir, { recursive: true });
  writeFileSync(join(rulesDir, REQUIRED_FILE), REQUIRED_BODY, 'utf8');
  writeFileSync(
    join(rulesDir, 'manifest.json'),
    JSON.stringify({
      version: '1.0',
      rules: [
        {
          id: 'filid_fractal-boundaries',
          filename: REQUIRED_FILE,
          required: true,
          title: 'FCA',
          description: 'required',
          templateHash: sha256(REQUIRED_BODY),
        },
      ],
    }),
    'utf8',
  );
}

beforeEach(() => {
  projectRoot = mkdtempSync(join(tmpdir(), 'filid-rule-scope-'));
  pluginRoot = mkdtempSync(join(tmpdir(), 'filid-rule-scope-plugin-'));
  writeTemplates();
});

afterEach(() => {
  // CLAUDE_CONFIG_DIR is one tmp dir for the whole file (vitest.setup.ts), so
  // the user channel is shared state between cases unless it is cleared.
  rmSync(userRulesDir(), { recursive: true, force: true });
  rmSync(projectRoot, { recursive: true, force: true });
  rmSync(pluginRoot, { recursive: true, force: true });
});

describe('rule document scope', () => {
  it('resolves the user layer to the host state root, not the repository', () => {
    const target = resolveFilidRuleTarget(projectRoot, 'user');

    expect(target?.kind).toBe('directory');
    const directoryPath =
      target?.kind === 'directory' ? target.directoryPath : '';
    expect(directoryPath).toBe(userRulesDir());
    expect(directoryPath.startsWith(projectRoot)).toBe(false);
  });

  it('resolves the project layer to the repository channel', () => {
    const target = resolveFilidRuleTarget(projectRoot, 'project');

    expect(target?.kind === 'directory' ? target.directoryPath : '').toBe(
      projectRulesDir(),
    );
  });

  it('defaults to the project layer when no scope is named', () => {
    expect(resolveFilidRuleTarget(projectRoot)).toStrictEqual(
      resolveFilidRuleTarget(projectRoot, 'project'),
    );
  });

  it('writes the user layer when the caller names it', () => {
    const result = syncRuleDocs(projectRoot, [], { pluginRoot, scope: 'user' });

    expect(result.copied).toContain(REQUIRED_FILE);
    expect(readFileSync(join(userRulesDir(), REQUIRED_FILE), 'utf8')).toBe(
      REQUIRED_BODY,
    );
    expect(existsSync(join(projectRulesDir(), REQUIRED_FILE))).toBe(false);
  });

  it('moves the documents when the chosen layer changes', () => {
    syncRuleDocs(projectRoot, [], { pluginRoot, scope: 'project' });

    const result = syncRuleDocs(projectRoot, [], { pluginRoot, scope: 'user' });

    expect(existsSync(join(userRulesDir(), REQUIRED_FILE))).toBe(true);
    expect(existsSync(join(projectRulesDir(), REQUIRED_FILE))).toBe(false);
    expect(result.otherScope).toMatchObject({
      scope: 'project',
      displayTarget: projectRulesDir(),
      filenames: [REQUIRED_FILE],
    });
  });

  it('leaves another owner untouched while retiring its own documents', () => {
    syncRuleDocs(projectRoot, [], { pluginRoot, scope: 'project' });
    writeFileSync(join(projectRulesDir(), FOREIGN_FILE), '# seiri', 'utf8');

    syncRuleDocs(projectRoot, [], { pluginRoot, scope: 'user' });

    expect(existsSync(join(projectRulesDir(), FOREIGN_FILE))).toBe(true);
    expect(existsSync(join(projectRulesDir(), REQUIRED_FILE))).toBe(false);
  });

  it('reports no other layer when nothing is deployed there', () => {
    const result = syncRuleDocs(projectRoot, [], { pluginRoot, scope: 'user' });

    expect(result.otherScope).toBeUndefined();
  });

  it('retires nothing across layers when the caller names no scope', () => {
    syncRuleDocs(projectRoot, [], { pluginRoot, scope: 'user' });

    const result = syncRuleDocs(projectRoot, [], { pluginRoot });

    expect(existsSync(join(projectRulesDir(), REQUIRED_FILE))).toBe(true);
    expect(existsSync(join(userRulesDir(), REQUIRED_FILE))).toBe(true);
    expect(result.otherScope).toBeUndefined();
  });
});
