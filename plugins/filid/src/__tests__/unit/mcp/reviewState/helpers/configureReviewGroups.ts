import { runReviewStateFixtureGit } from './runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './writeReviewStateFixtureFile.js';

/**
 * Configure an ignored local review policy and commit an exact source fan-out.
 * @param projectRoot Disposable seal fixture with one existing changed source.
 * @param count Positive number of reviewable one-file groups to prepare.
 * @param review Overrides layered over the one-file grouping limit.
 */
export function configureReviewGroups(
  projectRoot: string,
  count: number,
  review: Record<string, unknown> = {},
): void {
  writeReviewStateFixtureFile(projectRoot, '.git/info/exclude', '.filid/\n');
  writeReviewStateFixtureFile(
    projectRoot,
    '.filid/config.json',
    JSON.stringify({
      version: '2.0',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
      review: { groupFileLimit: 1, ...review },
    }),
  );
  for (let index = 1; index < count; index += 1)
    writeReviewStateFixtureFile(
      projectRoot,
      `src/value${index}.ts`,
      `export const value${index} = ${index};\n`,
    );
  if (count > 1) {
    runReviewStateFixtureGit(projectRoot, ['add', '--all']);
    runReviewStateFixtureGit(projectRoot, [
      'commit',
      '-m',
      'Add review groups',
    ]);
  }
}
