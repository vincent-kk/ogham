import { readFileSync } from 'node:fs';

import { writeReviewStateFixtureFile } from './writeReviewStateFixtureFile.js';

/**
 * Populate a fixture plugin with the canonical actor methods loaded by prepare.
 * @param pluginRoot Absolute temporary plugin root whose rules already exist.
 * @returns Nothing; copies both actor Markdown files into the fixture.
 */
export function writeReviewActorMethods(pluginRoot: string): void {
  for (const actor of ['reviewer', 'verifier']) {
    const relative = `skills/cross-review/reviewers/${actor}.md`;
    writeReviewStateFixtureFile(
      pluginRoot,
      relative,
      readFileSync(
        new URL(`../../../../../../${relative}`, import.meta.url),
        'utf8',
      ),
    );
  }
}
