import { createFixtureProjectRoot } from '../../../../integration/helpers/createFixtureProjectRoot.js';
import { seedFacts } from '../../../../integration/helpers/seedFacts.js';

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
 * The repository is given its facts here rather than in each test: analysis
 * reads the facts store, so a fixture without records is a project filid can
 * draw no reference-based conclusion about, and every test built on it would
 * be testing the absence of facts instead of what it means to test.
 *
 * @returns Fixture paths plus the prior plugin-root environment value.
 */
export async function createReviewStateSealFixture(): Promise<ReviewStateSealFixture> {
  const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  const pluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  const projectRoot = createFixtureProjectRoot('filid-review-seal-');
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
  await seedFacts(projectRoot);
  return { projectRoot, pluginRoot, branchName, originalPluginRoot };
}
