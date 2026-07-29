import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { loadManifest } from '../loaders/loadManifest.js';
import { getRuleDocsStatus } from '../status/getRuleDocsStatus.js';
import { applyRuleDocs } from '../sync/applyRuleDocs.js';
import { planRuleDocs } from '../sync/planRuleDocs.js';
import { resolveSeiriRuleTarget } from '../utils/resolveSeiriRuleTarget.js';

const pluginRoot = fileURLToPath(new URL('../../../../', import.meta.url));
// A real, shipped rule — the manifest picks it, so a renamed rule cannot
// leave this file asserting on a filename nothing deploys.
const anchor = loadManifest(pluginRoot).rules[0];
const userRulesDir = join(process.env.CLAUDE_CONFIG_DIR ?? '', 'rules');

/**
 * The layer a rule document is deployed to.
 *
 * `vitest.setup.ts` points CLAUDE_CONFIG_DIR at a per-file tmp dir, so the
 * user channel these cases assert on is never the developer's real ~/.claude.
 * That directory is shared by every case in this file, which is why the
 * teardown empties it — a leftover deployment would make the next case's
 * "the other layer holds nothing" reading a lie.
 */
describe('rule document scope', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
    rmSync(userRulesDir, { recursive: true, force: true });
  });

  function seedRepo(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), 'seiri-scope-'));
    tempDirs.push(repoRoot);
    execSync('git init', { cwd: repoRoot, stdio: 'ignore' });
    return repoRoot;
  }

  function projectRulesDir(repoRoot: string): string {
    return join(repoRoot, '.claude', 'rules');
  }

  it('resolves the user layer to the host state root, not the repository', () => {
    const repoRoot = seedRepo();
    const target = resolveSeiriRuleTarget(repoRoot, 'user');

    expect(target).not.toBeNull();
    expect(target?.kind).toBe('directory');
    const directoryPath =
      target?.kind === 'directory' ? target.directoryPath : '';
    expect(directoryPath).toBe(
      join(process.env.CLAUDE_CONFIG_DIR ?? '', 'rules'),
    );
    expect(directoryPath.startsWith(repoRoot)).toBe(false);
  });

  it('resolves the project layer to the repository channel', () => {
    const repoRoot = seedRepo();
    const target = resolveSeiriRuleTarget(repoRoot, 'project');

    expect(target?.kind).toBe('directory');
    expect(target?.kind === 'directory' ? target.directoryPath : '').toBe(
      join(repoRoot, '.claude', 'rules'),
    );
  });

  it('defaults to the project layer when no scope is named', () => {
    const repoRoot = seedRepo();
    const implicit = resolveSeiriRuleTarget(repoRoot);
    const explicit = resolveSeiriRuleTarget(repoRoot, 'project');

    expect(implicit).toStrictEqual(explicit);
  });

  it('applying under the user scope writes into the host state root', () => {
    const repoRoot = seedRepo();
    const result = applyRuleDocs(repoRoot, pluginRoot, [anchor.id], {
      scope: 'user',
    });

    expect(result.applied).toBe(true);
    expect(existsSync(join(userRulesDir, anchor.filename))).toBe(true);
    expect(existsSync(join(projectRulesDir(repoRoot), anchor.filename))).toBe(
      false,
    );
  });

  it('switching layers moves the documents rather than copying them', () => {
    const repoRoot = seedRepo();
    applyRuleDocs(repoRoot, pluginRoot, [anchor.id]);
    expect(existsSync(join(projectRulesDir(repoRoot), anchor.filename))).toBe(
      true,
    );

    const result = applyRuleDocs(repoRoot, pluginRoot, [anchor.id], {
      scope: 'user',
    });

    expect(existsSync(join(userRulesDir, anchor.filename))).toBe(true);
    expect(existsSync(join(projectRulesDir(repoRoot), anchor.filename))).toBe(
      false,
    );
    expect(result.otherScope).toEqual({
      scope: 'project',
      displayTarget: projectRulesDir(repoRoot),
      filenames: [anchor.filename],
    });
  });

  it('empties the other layer of owned rules only, sparing foreign files', () => {
    const repoRoot = seedRepo();
    applyRuleDocs(repoRoot, pluginRoot, [anchor.id], { scope: 'user' });
    // The real ~/.claude/rules holds personal policy files under no plugin's
    // namespace. This is the case that says a layer switch cannot eat them.
    const personal = join(userRulesDir, 'external-fetch-policy.md');
    const foreign = join(userRulesDir, 'filid_fca-policy.md');
    writeFileSync(personal, '# personal\n', 'utf8');
    writeFileSync(foreign, '# foreign\n', 'utf8');

    applyRuleDocs(repoRoot, pluginRoot, [anchor.id], { scope: 'project' });

    expect(existsSync(join(userRulesDir, anchor.filename))).toBe(false);
    expect(existsSync(personal)).toBe(true);
    expect(existsSync(foreign)).toBe(true);
    expect(existsSync(join(projectRulesDir(repoRoot), anchor.filename))).toBe(
      true,
    );
  });

  it('previews the other layer without writing to either', () => {
    const repoRoot = seedRepo();
    applyRuleDocs(repoRoot, pluginRoot, [anchor.id]);

    const plan = planRuleDocs(repoRoot, pluginRoot, [anchor.id], {
      scope: 'user',
    });

    expect(plan.applied).toBe(false);
    // Planned against the chosen layer: the user channel is empty, so the
    // anchor is a copy. Planned against the project layer it would already
    // be `unchanged`.
    expect(
      plan.outcomes.find((outcome) => outcome.id === anchor.id)?.action,
    ).toBe('copy');
    expect(plan.otherScope).toEqual({
      scope: 'project',
      displayTarget: projectRulesDir(repoRoot),
      filenames: [anchor.filename],
    });
    // A dry-run neither installs at the new layer nor retires at the old one.
    expect(existsSync(join(userRulesDir, anchor.filename))).toBe(false);
    expect(existsSync(join(projectRulesDir(repoRoot), anchor.filename))).toBe(
      true,
    );
  });

  it('reports deployment status against the layer it was asked about', () => {
    const repoRoot = seedRepo();
    applyRuleDocs(repoRoot, pluginRoot, [anchor.id], { scope: 'user' });

    const asUser = getRuleDocsStatus(repoRoot, pluginRoot, 'user');
    const asProject = getRuleDocsStatus(repoRoot, pluginRoot, 'project');
    const byDefault = getRuleDocsStatus(repoRoot, pluginRoot);

    expect(asUser.find((entry) => entry.id === anchor.id)?.deployed).toBe(true);
    expect(asProject.find((entry) => entry.id === anchor.id)?.deployed).toBe(
      false,
    );
    expect(byDefault).toStrictEqual(asProject);
  });

  it('omits otherScope when the other layer holds nothing of ours', () => {
    const repoRoot = seedRepo();

    const plan = planRuleDocs(repoRoot, pluginRoot, [anchor.id], {
      scope: 'user',
    });
    const applied = applyRuleDocs(repoRoot, pluginRoot, [anchor.id], {
      scope: 'user',
    });

    expect(plan.otherScope).toBeUndefined();
    expect(applied.otherScope).toBeUndefined();
  });
});
