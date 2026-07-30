import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { spawnCliSync } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { checkZeroPeerFile } from '../../../core/rules/ruleEngine/utils/checkZeroPeerFile.js';
import { scanProject } from '../../../core/tree/fractalTree/index.js';
import type { RuleContext } from '../../../types/rules.js';

const IGNORED_CACHE = 'tsconfig.e2echeck.tsbuildinfo';
const TRACKED_CACHE = 'tsconfig.tsbuildinfo';

function initRepository(root: string): void {
  spawnCliSync('git', ['init', '--quiet'], { cwd: root });
  spawnCliSync('git', ['config', 'user.email', 'unit@filid.test'], {
    cwd: root,
  });
  spawnCliSync('git', ['config', 'user.name', 'filid unit'], { cwd: root });
}

/**
 * A fractal root holding one ignored build cache, one force-added build cache
 * matching the same pattern, and one wholly ignored output directory.
 */
function setupRepository(root: string): void {
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'generated'), { recursive: true });
  writeFileSync(join(root, 'INTENT.md'), '# fixture\n');
  writeFileSync(join(root, 'index.ts'), 'export const fixture = 1;\n');
  writeFileSync(join(root, '.gitignore'), '*.tsbuildinfo\ngenerated/\n');
  writeFileSync(join(root, IGNORED_CACHE), '{}\n');
  writeFileSync(join(root, TRACKED_CACHE), '{}\n');
  writeFileSync(join(root, 'src', 'unit.ts'), 'export const unit = 1;\n');
  writeFileSync(
    join(root, 'generated', 'output.ts'),
    'export const out = 1;\n',
  );
  initRepository(root);
  spawnCliSync('git', ['add', '-f', TRACKED_CACHE], { cwd: root });
}

describe('fractal-tree git-ignored paths', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(
      tmpdir(),
      `filid-gitignore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('omits a git-ignored root peer file from peerFiles', async () => {
    setupRepository(tmpDir);

    const tree = await scanProject(tmpDir);

    expect(tree.nodes.get(tmpDir)!.peerFiles).not.toContain(IGNORED_CACHE);
  });

  it('raises zero-peer-file for the tracked build cache but not the ignored one', async () => {
    setupRepository(tmpDir);

    const tree = await scanProject(tmpDir);
    const context: RuleContext = { node: tree.nodes.get(tmpDir)!, tree };
    const messages = checkZeroPeerFile()(context).map(
      (violation) => violation.message,
    );

    expect(messages.some((message) => message.includes(IGNORED_CACHE))).toBe(
      false,
    );
    expect(messages.some((message) => message.includes(TRACKED_CACHE))).toBe(
      true,
    );
  });

  it('keeps a tracked file that matches an ignore pattern', async () => {
    setupRepository(tmpDir);

    const tree = await scanProject(tmpDir);

    expect(tree.nodes.get(tmpDir)!.peerFiles).toContain(TRACKED_CACHE);
  });

  it('omits a git-ignored directory from the node set', async () => {
    setupRepository(tmpDir);

    const tree = await scanProject(tmpDir);

    expect(tree.nodes.has(join(tmpDir, 'generated'))).toBe(false);
    expect(tree.nodes.has(join(tmpDir, 'src'))).toBe(true);
  });

  it('scans every path outside a git work tree', async () => {
    setupRepository(tmpDir);
    rmSync(join(tmpDir, '.git'), { recursive: true, force: true });

    const tree = await scanProject(tmpDir);

    expect(tree.nodes.get(tmpDir)!.peerFiles).toContain(IGNORED_CACHE);
    expect(tree.nodes.has(join(tmpDir, 'generated'))).toBe(true);
  });
});
