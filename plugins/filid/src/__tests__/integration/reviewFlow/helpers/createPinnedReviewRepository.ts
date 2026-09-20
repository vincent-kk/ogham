import { cpSync } from 'node:fs';

import { writeReviewStateFixtureFile } from '../../../unit/mcp/reviewState/helpers/writeReviewStateFixtureFile.js';
import { createFixtureProjectRoot } from '../../helpers/createFixtureProjectRoot.js';
import { seedFacts } from '../../helpers/seedFacts.js';
import { testRunRoot } from '../../helpers/testRunRoot.js';

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
 * Built repositories, keyed by the bytes that determine their commit ids. The
 * state is process-local and only ever copied from, so no two fixtures meet in
 * it.
 */
const templates = new Map<string, string>();

/**
 * Identity of a repository's content, independent of key insertion order.
 * @param files Base and feature file contents.
 * @returns A key equal for any two arguments that commit the same bytes.
 */
function templateKey(files: PinnedReviewRepositoryFiles): string {
  const pairs = (one: Readonly<Record<string, string>>): [string, string][] =>
    Object.entries(one).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([pairs(files.base), pairs(files.feature)]);
}

/**
 * Create a Git repository whose commit ids depend only on the given bytes.
 *
 * The repository is given its facts here rather than in each test: analysis
 * reads the facts store, so a fixture without records is a project filid can
 * draw no reference-based conclusion about. Seeding writes nothing into the
 * repository — records live in the state directory outside it — so the pinned
 * commit ids are unchanged. It runs per fixture rather than once, because the
 * store is keyed by the canonical project root and every fixture has its own.
 *
 * The history is committed once per distinct content and copied afterwards.
 * `runPinnedReviewGit` pins the identity and the clock, so a rebuild from the
 * same bytes would produce the commit ids the copy already carries.
 *
 * @param files Base and feature file contents, keyed by project-relative path.
 * @returns Absolute temporary repository root with the feature branch checked out.
 * @throws When Git fails to build the history or the facts are refused.
 */
export async function createPinnedReviewRepository(
  files: PinnedReviewRepositoryFiles,
): Promise<string> {
  const key = templateKey(files);
  let template = templates.get(key);
  if (template === undefined) {
    template = createFixtureProjectRoot(
      'filid-review-flow-template-',
      testRunRoot(),
    );
    runPinnedReviewGit(template, ['init', '-b', 'main']);
    for (const [branch, commit] of [
      [null, files.base],
      [PINNED_REVIEW_BRANCH, files.feature],
    ] as const) {
      if (branch) runPinnedReviewGit(template, ['checkout', '-b', branch]);
      for (const [path, content] of Object.entries(commit))
        writeReviewStateFixtureFile(template, path, content);
      runPinnedReviewGit(template, ['add', '--all']);
      runPinnedReviewGit(template, ['commit', '-m', branch ?? 'base']);
    }
    templates.set(key, template);
  }
  const projectRoot = createFixtureProjectRoot('filid-review-flow-');
  cpSync(template, projectRoot, { recursive: true, preserveTimestamps: true });
  await seedFacts(projectRoot);
  return projectRoot;
}
