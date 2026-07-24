import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { loadManifest } from '../loaders/loadManifest.js';
import { applyRuleDocs } from '../sync/applyRuleDocs.js';
import { planRuleDocs } from '../sync/planRuleDocs.js';

const pluginRoot = fileURLToPath(new URL('../../../../', import.meta.url));
// A real, shipped rule to deploy alongside the orphan.
const anchor = loadManifest(pluginRoot).rules[0];

describe('orphan rule-doc retirement', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function seedRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-orphan-'));
    tempDirs.push(repoRoot);
    execSync('git init', { cwd: repoRoot, stdio: 'ignore' });
    return repoRoot;
  }

  it('applyRuleDocs retires a namespace orphan, sparing foreign and shipped files', () => {
    const repoRoot = seedRepo();
    applyRuleDocs(repoRoot, pluginRoot, [anchor.id]);
    const rulesDir = join(repoRoot, '.claude', 'rules');
    writeFileSync(
      join(rulesDir, 'seiri_retired-rule.md'),
      '# retired\n',
      'utf8',
    );
    writeFileSync(join(rulesDir, 'filid_fca-policy.md'), '# foreign\n', 'utf8');

    const result = applyRuleDocs(repoRoot, pluginRoot, [anchor.id]);
    const removed = result.outcomes
      .filter((o) => o.action === 'remove')
      .map((o) => o.filename);
    expect(removed).toContain('seiri_retired-rule.md');
    expect(existsSync(join(rulesDir, 'seiri_retired-rule.md'))).toBe(false);
    // Foreign namespace and the shipped anchor are untouched.
    expect(existsSync(join(rulesDir, 'filid_fca-policy.md'))).toBe(true);
    expect(existsSync(join(rulesDir, anchor.filename))).toBe(true);
  });

  it('planRuleDocs previews the retirement without deleting the file', () => {
    const repoRoot = seedRepo();
    applyRuleDocs(repoRoot, pluginRoot, [anchor.id]);
    const rulesDir = join(repoRoot, '.claude', 'rules');
    const orphan = join(rulesDir, 'seiri_retired-rule.md');
    writeFileSync(orphan, '# retired\n', 'utf8');

    const plan = planRuleDocs(repoRoot, pluginRoot, [anchor.id]);
    expect(plan.applied).toBe(false);
    const previewed = plan.outcomes
      .filter((o) => o.action === 'remove')
      .map((o) => o.filename);
    expect(previewed).toContain('seiri_retired-rule.md');
    // A dry-run must not touch the file.
    expect(existsSync(orphan)).toBe(true);
  });
});
