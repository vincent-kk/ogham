import { runReviewStateFixtureGit } from './runReviewStateFixtureGit.js';

/**
 * Commit the complete worktree of a temporary review-state repository.
 *
 * @param projectRoot - Absolute temporary Git repository root.
 * @param message - Deterministic commit subject used by the fixture.
 * @returns Nothing.
 * @throws When staging or committing the fixture fails.
 */
export function commitReviewStateFixture(
  projectRoot: string,
  message: string,
): void {
  for (const args of [
    ['add', '--all'],
    ['commit', '-m', message],
  ])
    runReviewStateFixtureGit(projectRoot, args);
}
