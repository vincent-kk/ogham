import { mkdtempSync } from 'node:fs';

import { portableJoin, tmp } from '@ogham/cross-platform';

import { createReviewRulePluginRoot } from './createReviewRulePluginRoot.js';
import { runReviewStateFixtureGit } from './runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './writeReviewStateFixtureFile.js';

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
  runReviewStateFixtureGit(projectRoot, ['init', '-b', 'main']);
  runReviewStateFixtureGit(projectRoot, [
    'config',
    'user.email',
    'filid@example.test',
  ]);
  runReviewStateFixtureGit(projectRoot, ['config', 'user.name', 'Filid Test']);
  writeReviewStateFixtureFile(
    projectRoot,
    'src/value.ts',
    'export const value = 1;\n',
  );
  writeReviewStateFixtureFile(projectRoot, 'yarn.lock', 'base-lock\n');
  runReviewStateFixtureGit(projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(projectRoot, ['commit', '-m', 'base']);
  runReviewStateFixtureGit(projectRoot, ['checkout', '-b', branchName]);
  writeReviewStateFixtureFile(
    projectRoot,
    'src/value.ts',
    'export const value = 2;\n',
  );
  writeReviewStateFixtureFile(projectRoot, 'yarn.lock', 'feature-lock\n');
  runReviewStateFixtureGit(projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(projectRoot, ['commit', '-m', 'feature']);
  return { projectRoot, pluginRoot, branchName, originalPluginRoot };
}
