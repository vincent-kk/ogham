import { seedFacts } from '../../../../integration/helpers/seedFacts.js';

import { runReviewStateFixtureGit } from './runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './writeReviewStateFixtureFile.js';

/**
 * Configure an ignored local review policy and commit an exact source fan-out.
 *
 * The added files are given their facts before the helper returns: a new path
 * moves the project's resolution epoch, which leaves every stored record
 * needing re-resolution, and a fixture that skipped it would be reviewing a
 * project filid knows nothing about.
 * @param projectRoot Disposable seal fixture with one existing changed source.
 * @param count Positive number of reviewable one-file groups to prepare.
 * @param review Overrides layered over the one-file grouping limit.
 * @returns Nothing; the project holds the policy, the files and their facts.
 */
export async function configureReviewGroups(
  projectRoot: string,
  count: number,
  review: Record<string, unknown> = {},
): Promise<void> {
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
    await seedFacts(projectRoot);
  }
}
