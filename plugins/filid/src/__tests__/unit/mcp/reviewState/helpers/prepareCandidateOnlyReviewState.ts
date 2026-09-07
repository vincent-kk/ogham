import { rmSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform';

import { handleReviewState } from '../../../../../mcp/tools/reviewState/index.js';
import type { ReviewPreparePayload } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import type { ReviewStateSealFixture } from './createReviewStateSealFixture.js';
import { runReviewStateFixtureGit } from './runReviewStateFixtureGit.js';
import { writeReviewStateFixtureFile } from './writeReviewStateFixtureFile.js';

/**
 * Replace fixture review artifacts with a real candidate-only Git session.
 * @param fixture Repository and plugin fixture whose source is generated for this case.
 * @returns Fresh rounds-0 response with canonical review and verify artifacts.
 */
export async function prepareCandidateOnlyReviewState(
  fixture: ReviewStateSealFixture,
): Promise<ReviewPreparePayload> {
  rmSync(portableJoin(fixture.projectRoot, '.filid', 'review'), {
    recursive: true,
    force: true,
  });
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    '.filid/config.json',
    JSON.stringify({
      version: '2.0',
      language: 'English',
      adapters: { mode: 'auto', enabled: [] },
      rules: {},
      structure: { generatedPaths: ['src', 'generated', '.filid/config.json'] },
    }),
  );
  writeReviewStateFixtureFile(
    fixture.projectRoot,
    'generated/INTENT.md',
    '# Invalid generated contract\n',
  );
  runReviewStateFixtureGit(fixture.projectRoot, ['add', '--all']);
  runReviewStateFixtureGit(fixture.projectRoot, [
    'commit',
    '-m',
    'candidate-only',
  ]);
  return handleReviewState({
    action: 'prepare',
    projectRoot: fixture.projectRoot,
  });
}
