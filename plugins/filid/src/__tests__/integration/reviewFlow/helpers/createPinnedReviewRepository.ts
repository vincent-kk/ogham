import { mkdtempSync } from 'node:fs';

import { portableJoin, tmp } from '@ogham/cross-platform';

import { writeReviewStateFixtureFile } from '../../../unit/mcp/reviewState/helpers/writeReviewStateFixtureFile.js';

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
 * @param files Base and feature file contents, keyed by project-relative path.
 * @returns Absolute temporary repository root with the feature branch checked out.
 */
export function createPinnedReviewRepository(
  files: PinnedReviewRepositoryFiles,
): string {
  const projectRoot = mkdtempSync(portableJoin(tmp(), 'filid-review-flow-'));
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
  return projectRoot;
}
