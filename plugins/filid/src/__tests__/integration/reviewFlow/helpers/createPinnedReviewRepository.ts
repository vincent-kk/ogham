import { writeReviewStateFixtureFile } from '../../../unit/mcp/reviewState/helpers/writeReviewStateFixtureFile.js';
import { createFixtureProjectRoot } from '../../helpers/createFixtureProjectRoot.js';
import { seedFacts } from '../../helpers/seedFacts.js';

import { runPinnedReviewGit } from './runPinnedReviewGit.js';

/** Feature branch every pinned repository checks out. */
export const PINNED_REVIEW_BRANCH = 'feature/review-flow';

/** Files of the two commits that make a pinned review repository. */
export interface PinnedReviewRepositoryFiles {
  /** Files committed on `main`. */
  base: Readonly<Record<string, string>>;
  /** Files written over the base and committed on the feature branch. */
  feature: Readonly<Record<string, string>>;
}

/**
 * Create a Git repository whose commit ids depend only on the given bytes.
 *
 * The repository is given its facts here rather than in each test: analysis
 * reads the facts store, so a fixture without records is a project filid can
 * draw no reference-based conclusion about. Seeding writes nothing into the
 * repository — records live in the state directory outside it — so the pinned
 * commit ids are unchanged.
 *
 * @param files Base and feature file contents, keyed by project-relative path.
 * @returns Absolute temporary repository root with the feature branch checked out.
 */
export async function createPinnedReviewRepository(
  files: PinnedReviewRepositoryFiles,
): Promise<string> {
  const projectRoot = createFixtureProjectRoot('filid-review-flow-');
  runPinnedReviewGit(projectRoot, ['init', '-b', 'main']);
  for (const [branch, commit] of [
    [null, files.base],
    [PINNED_REVIEW_BRANCH, files.feature],
  ] as const) {
    if (branch) runPinnedReviewGit(projectRoot, ['checkout', '-b', branch]);
    for (const [path, content] of Object.entries(commit))
      writeReviewStateFixtureFile(projectRoot, path, content);
    runPinnedReviewGit(projectRoot, ['add', '--all']);
    runPinnedReviewGit(projectRoot, ['commit', '-m', branch ?? 'base']);
  }
  await seedFacts(projectRoot);
  return projectRoot;
}
