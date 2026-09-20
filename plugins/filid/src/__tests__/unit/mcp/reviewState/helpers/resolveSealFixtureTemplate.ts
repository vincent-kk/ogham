/**
 * @file resolveSealFixtureTemplate.ts
 * @description Builds the seal fixture's repository once per worker process and
 * keeps it in module state, because the point of the template is that the eight
 * Git commands behind it run once instead of once per fixture. The state is
 * process-local and never handed out for mutation, so two fixtures cannot reach
 * each other through it.
 */
import { createFixtureProjectRoot } from '../../../../integration/helpers/createFixtureProjectRoot.js';
import { testRunRoot } from '../../../../integration/helpers/testRunRoot.js';

import { runReviewStateFixtureGit } from './runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './writeReviewStateFixtureFile.js';

/** The prepared repository every seal fixture is copied from. */
export interface SealFixtureTemplate {
  /** Repository root to copy; callers copy it and never write into it. */
  root: string;
  /** Feature branch the template leaves checked out, one commit ahead of `main`. */
  branchName: string;
}

let prepared: SealFixtureTemplate | undefined;

/**
 * Get the seal fixture's template repository, building it on first use.
 *
 * The repository holds one reviewable path and one skipped path, committed on
 * `main` and changed again on the feature branch — the history every seal test
 * reviews.
 * @returns The template root and the branch it leaves checked out. The same object every call.
 * @throws When one of the Git commands building the template fails.
 */
export function resolveSealFixtureTemplate(): SealFixtureTemplate {
  if (prepared) return prepared;
  const root = createFixtureProjectRoot(
    'filid-review-seal-template-',
    testRunRoot(),
  );
  const branchName = 'feature/seal-v7';
  runReviewStateFixtureGit(root, ['init', '-b', 'main']);
  runReviewStateFixtureGit(root, [
    'config',
    'user.email',
    'filid@example.test',
  ]);
  runReviewStateFixtureGit(root, ['config', 'user.name', 'Filid Test']);
  writeReviewStateFixtureFile(root, 'src/value.ts', 'export const value = 1;\n');
  writeReviewStateFixtureFile(root, 'yarn.lock', 'base-lock\n');
  runReviewStateFixtureGit(root, ['add', '--all']);
  runReviewStateFixtureGit(root, ['commit', '-m', 'base']);
  runReviewStateFixtureGit(root, ['checkout', '-b', branchName]);
  writeReviewStateFixtureFile(root, 'src/value.ts', 'export const value = 2;\n');
  writeReviewStateFixtureFile(root, 'yarn.lock', 'feature-lock\n');
  runReviewStateFixtureGit(root, ['add', '--all']);
  runReviewStateFixtureGit(root, ['commit', '-m', 'feature']);
  prepared = { root, branchName };
  return prepared;
}
