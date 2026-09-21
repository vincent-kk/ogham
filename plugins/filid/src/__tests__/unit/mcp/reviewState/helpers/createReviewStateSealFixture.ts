import { cpSync } from 'node:fs';

import { createFixtureProjectRoot } from '../../../../integration/helpers/createFixtureProjectRoot.js';
import { seedFacts } from '../../../../integration/helpers/seedFacts.js';

import { createReviewRulePluginRoot } from './createReviewRulePluginRoot.js';
import { resolveSealFixtureTemplate } from './resolveSealFixtureTemplate.js';

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
 * The history is copied from a template built once per worker process rather
 * than committed again per fixture; a copy of a repository is that repository,
 * down to the object ids and the index. The facts are seeded after the copy
 * because the store is keyed by the canonical project root, which every copy
 * has its own of.
 *
 * @returns Fixture paths plus the prior plugin-root environment value.
 * @throws When the template cannot be built or the facts are refused.
 */
export async function createReviewStateSealFixture(): Promise<ReviewStateSealFixture> {
  const originalPluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  const pluginRoot = createReviewRulePluginRoot();
  process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  const template = resolveSealFixtureTemplate();
  const projectRoot = createFixtureProjectRoot('filid-review-seal-');
  cpSync(template.root, projectRoot, {
    recursive: true,
    preserveTimestamps: true,
  });
  await seedFacts(projectRoot);
  return {
    projectRoot,
    pluginRoot,
    branchName: template.branchName,
    originalPluginRoot,
  };
}
