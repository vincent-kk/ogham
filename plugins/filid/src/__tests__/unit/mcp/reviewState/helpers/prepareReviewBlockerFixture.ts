import { resolveReviewStatePaths } from '../../../../../mcp/tools/reviewState/state/resolveReviewStatePaths.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

import { buildReviewOpinion } from './buildReviewOpinion.js';
import type { ReviewStateSealFixture } from './createReviewStateSealFixture.js';
import { prepareReviewStateSealFixture } from './prepareReviewStateSealFixture.js';
import { validateReviewStateSealGroup } from './validateReviewStateSealGroup.js';

/** Prepared INCONCLUSIVE fixture plus its canonical artifact paths. */
export interface PreparedReviewBlockerFixture {
  /** Current-policy state with one trusted unresolved reviewer gap. */
  state: ReviewStateRecord;
  /** Canonical branch-local paths resolved from the fixture identity. */
  paths: ReviewStatePaths;
}

/**
 * Prepare and validate one trusted reviewer gap with actionable advice.
 * @param fixture Temporary repository and plugin root used by the test.
 * @returns Prepared state that must seal as INCONCLUSIVE and its paths.
 */
export async function prepareReviewBlockerFixture(
  fixture: ReviewStateSealFixture,
): Promise<PreparedReviewBlockerFixture> {
  const state = await prepareReviewStateSealFixture(fixture);
  const group = state.groups[0];
  if (!group) throw new Error('blocker fixture did not create a review group');
  const opinion = buildReviewOpinion(state, group);
  opinion.gaps = [
    {
      path: 'src/value.ts',
      rule: 'FCA-11',
      detail: 'Project-level cycle evidence is not available in this group.',
      resolution: {
        question: 'Does the project dependency graph contain a cycle?',
        evidenceNeeded: ['A current project-level dependency graph result.'],
        nextAction: 'Run the project graph check and validate its evidence.',
        doneWhen: 'The graph result establishes whether a cycle exists.',
        suggestedOwner: 'agent',
      },
    },
  ];
  const validated = await validateReviewStateSealGroup({
    fixture,
    state,
    opinion,
    decisions: [],
  });
  return {
    state: validated,
    paths: resolveReviewStatePaths(validated.projectRoot, validated.branchName),
  };
}
