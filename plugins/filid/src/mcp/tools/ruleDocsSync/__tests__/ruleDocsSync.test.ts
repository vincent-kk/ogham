import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { handleRuleDocsSync } from '../ruleDocsSync.js';

const pluginRoot = fileURLToPath(new URL('../../../../../', import.meta.url));

// Drive the fixtures off the real shipped manifest, not a hard-coded rule id.
// When filid ships only the required rule (fca-policy), the optional-doc block
// below skips loudly and revives automatically the day an optional rule is
// registered again.
interface ManifestEntry {
  id: string;
  filename: string;
  required?: boolean;
}
const manifest = JSON.parse(
  readFileSync(join(pluginRoot, 'templates', 'rules', 'manifest.json'), 'utf8'),
) as { rules: ManifestEntry[] };
const REQUIRED = manifest.rules.find((r) => r.required);
if (!REQUIRED) throw new Error('manifest must declare a required rule');
const OPTIONAL = manifest.rules.find((r) => !r.required);
const optionalId = OPTIONAL?.id ?? '';
const optionalFile = OPTIONAL?.filename ?? '';

function template(filename: string): string {
  return readFileSync(join(pluginRoot, 'templates', 'rules', filename), 'utf8');
}

describe('handleRuleDocsSync', () => {
  const tempDirs: string[] = [];
  const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;

  afterEach(() => {
    process.env.CLAUDE_PLUGIN_ROOT = originalPluginRoot;
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function createTempRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'filid-rule-docs-sync-'));
    tempDirs.push(repoRoot);
    execSync('git init', { cwd: repoRoot, stdio: 'ignore' });
    process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
    return repoRoot;
  }

  it('accepts selections as an object map', () => {
    const repoRoot = createTempRepo();

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: { [REQUIRED.id]: true },
    });

    expect(output.action).toBe('sync');
    if (output.action !== 'sync') throw new Error('expected sync output');

    expect(output.selections).toEqual({ [REQUIRED.id]: true });
    expect(
      existsSync(join(repoRoot, '.claude', 'rules', REQUIRED.filename)),
    ).toBe(true);
  });

  it('recovers selections passed as a JSON string', () => {
    const repoRoot = createTempRepo();

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: `{"${REQUIRED.id}":true}`,
    });

    expect(output.action).toBe('sync');
    if (output.action !== 'sync') throw new Error('expected sync output');

    expect(output.selections).toEqual({ [REQUIRED.id]: true });

    const deployed = join(repoRoot, '.claude', 'rules', REQUIRED.filename);
    expect(existsSync(deployed)).toBe(true);
    expect(readFileSync(deployed, 'utf8')).toBe(template(REQUIRED.filename));
  });

  it('throws a descriptive error for invalid selection strings', () => {
    const repoRoot = createTempRepo();

    expect(() =>
      handleRuleDocsSync({
        action: 'sync',
        path: repoRoot,
        selections: '{bad json}',
      }),
    ).toThrow(
      'selections must be a Record<string, boolean> object; received a string that is not valid JSON',
    );
  });

  it('records unknown resync ids in result.skipped', () => {
    const repoRoot = createTempRepo();

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: {},
      resync: ['does-not-exist'],
    });
    if (output.action !== 'sync') throw new Error('expected sync output');
    expect(output.result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'does-not-exist',
          reason: 'unknown rule id',
        }),
      ]),
    );
    expect(output.resync).toEqual([]);
  });

  it('recovers resync passed as a JSON string array', () => {
    const repoRoot = createTempRepo();

    // A valid JSON-array string must parse into an array; the unknown id then
    // lands in `skipped`, exercising the string-parse path without depending on
    // any optional rule being present.
    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: {},
      resync: '["does-not-exist"]',
    });
    if (output.action !== 'sync') throw new Error('expected sync output');
    expect(output.result.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'does-not-exist' }),
      ]),
    );
  });

  it('throws a descriptive error for invalid resync strings', () => {
    const repoRoot = createTempRepo();

    expect(() =>
      handleRuleDocsSync({
        action: 'sync',
        path: repoRoot,
        selections: {},
        resync: '[bad json]',
      }),
    ).toThrow(
      'resync must be a string array; received a non-JSON string: "[bad json]"',
    );
  });

  it('auto-updates required rule when deployed content drifts', () => {
    const repoRoot = createTempRepo();

    // Seed the required rule.
    handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: {},
    });
    const deployed = join(repoRoot, '.claude', 'rules', REQUIRED.filename);
    writeFileSync(deployed, '# stale required\n', 'utf8');

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: {},
    });
    if (output.action !== 'sync') throw new Error('expected sync output');
    expect(output.result.updated).toContain(REQUIRED.filename);
    expect(output.result.drift).not.toContain(REQUIRED.filename);
    expect(readFileSync(deployed, 'utf8')).not.toBe('# stale required\n');
  });

  it('status exposes templateHash/deployedHash/inSync for deployed entries', () => {
    const repoRoot = createTempRepo();

    handleRuleDocsSync({ action: 'sync', path: repoRoot, selections: {} });
    const deployed = join(repoRoot, '.claude', 'rules', REQUIRED.filename);
    writeFileSync(deployed, '# user tampered\n', 'utf8');

    const output = handleRuleDocsSync({ action: 'status', path: repoRoot });
    if (output.action !== 'status') throw new Error('expected status output');
    // Required rules are partitioned into `autoDeployed`; `entries` holds only
    // optional rules. The hash/inSync computation is identical for both.
    const entry = output.status.autoDeployed.find((e) => e.id === REQUIRED.id);
    expect(entry).toBeDefined();
    expect(entry!.templateHash).toMatch(/^[a-f0-9]{64}$/);
    expect(entry!.deployedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(entry!.inSync).toBe(false);
  });

  it('retires orphaned rule docs left in this plugin namespace', () => {
    const repoRoot = createTempRepo();
    handleRuleDocsSync({ action: 'sync', path: repoRoot, selections: {} });
    const rulesDir = join(repoRoot, '.claude', 'rules');
    // A rule this plugin no longer ships, plus a foreign-namespace file.
    writeFileSync(
      join(rulesDir, 'filid_retired-rule.md'),
      '# retired\n',
      'utf8',
    );
    writeFileSync(
      join(rulesDir, 'seiri_test-validity.md'),
      '# foreign\n',
      'utf8',
    );

    const output = handleRuleDocsSync({
      action: 'sync',
      path: repoRoot,
      selections: {},
    });
    if (output.action !== 'sync') throw new Error('expected sync output');
    // Orphan in our namespace is retired; required + foreign files survive.
    expect(output.result.removed).toContain('filid_retired-rule.md');
    expect(existsSync(join(rulesDir, 'filid_retired-rule.md'))).toBe(false);
    expect(existsSync(join(rulesDir, REQUIRED.filename))).toBe(true);
    expect(existsSync(join(rulesDir, 'seiri_test-validity.md'))).toBe(true);
  });

  // Optional-doc behaviour (deploy → tamper → preserve-or-resync) needs a
  // `required: false` manifest entry. filid currently ships only fca-policy, so
  // these skip loudly; they revive automatically once an optional rule returns.
  describe.skipIf(!OPTIONAL)(
    'optional rule docs (needs a required:false manifest entry)',
    () => {
      it('reports optional drift without resync opt-in', () => {
        const repoRoot = createTempRepo();

        handleRuleDocsSync({
          action: 'sync',
          path: repoRoot,
          selections: { [optionalId]: true },
        });
        const deployed = join(repoRoot, '.claude', 'rules', optionalFile);
        writeFileSync(deployed, '# user tampered\n', 'utf8');

        const output = handleRuleDocsSync({
          action: 'sync',
          path: repoRoot,
          selections: { [optionalId]: true },
        });
        if (output.action !== 'sync') throw new Error('expected sync output');
        expect(output.result.drift).toContain(optionalFile);
        expect(output.result.updated).not.toContain(optionalFile);
        expect(readFileSync(deployed, 'utf8')).toBe('# user tampered\n');
      });

      it('overwrites optional drift when resync is provided', () => {
        const repoRoot = createTempRepo();

        handleRuleDocsSync({
          action: 'sync',
          path: repoRoot,
          selections: { [optionalId]: true },
        });
        const deployed = join(repoRoot, '.claude', 'rules', optionalFile);
        writeFileSync(deployed, '# user tampered\n', 'utf8');

        const output = handleRuleDocsSync({
          action: 'sync',
          path: repoRoot,
          selections: { [optionalId]: true },
          resync: [optionalId],
        });
        if (output.action !== 'sync') throw new Error('expected sync output');
        expect(output.result.updated).toContain(optionalFile);
        expect(output.result.drift).not.toContain(optionalFile);
        expect(output.resync).toEqual([optionalId]);
        expect(readFileSync(deployed, 'utf8')).toBe(template(optionalFile));
      });
    },
  );
});
