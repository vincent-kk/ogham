import { mkdtempSync } from 'node:fs';

import {
  ensureDirectorySync,
  portableDirname,
  portableJoin,
  resolveContainedPath,
  spawnCliSync,
  tmp,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { createReviewRulePluginRoot } from './createReviewRulePluginRoot.js';

/** Complete temporary-repository identity used by seal integration tests. */
export interface ReviewStateSealFixture {
  /** Temporary Git repository containing one reviewable and one skipped path. */
  projectRoot: string;
  /** Temporary plugin root containing the minimal built-in review rule. */
  pluginRoot: string;
  /** Feature branch prepared and sealed by the fixture. */
  branchName: string;
  /** Host plugin-root value restored after the fixture is removed. */
  originalPluginRoot: string | undefined;
}

/**
 * Create a clean temporary repository for seal integration tests.
 *
 * @returns Fixture paths plus the prior plugin-root environment value.
 */
export function createReviewStateSealFixture(): ReviewStateSealFixture {
  const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  const pluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  const projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-seal-'));
  const branchName = 'feature/seal-v7';
  const runGit = (args: readonly string[]): void => {
    const result = spawnCliSync('git', args, { cwd: projectRoot });
    if (result.code !== 0 || result.spawnError)
      throw new Error(result.stderr || result.spawnError?.message);
  };
  const writeProjectFile = (relativePath: string, content: string): void => {
    const path = resolveContainedPath(projectRoot, relativePath);
    ensureDirectorySync(portableDirname(path));
    writeFileAtomicallySync(path, content);
  };
  runGit(['init', '-b', 'main']);
  runGit(['config', 'user.email', 'filid@example.test']);
  runGit(['config', 'user.name', 'Filid Test']);
  writeProjectFile('src/value.ts', 'export const value = 1;\n');
  writeProjectFile('yarn.lock', 'base-lock\n');
  runGit(['add', '--all']);
  runGit(['commit', '-m', 'base']);
  runGit(['checkout', '-b', branchName]);
  writeProjectFile('src/value.ts', 'export const value = 2;\n');
  writeProjectFile('yarn.lock', 'feature-lock\n');
  runGit(['add', '--all']);
  runGit(['commit', '-m', 'feature']);
  return { projectRoot, pluginRoot, branchName, originalPluginRoot };
}
