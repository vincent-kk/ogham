import type {
  FoldReviewVerdictInput,
  ReviewBlocker,
  ReviewBlockerCause,
  ReviewChecklistResult,
  ReviewDecisionJoinResult,
  ReviewVerdict,
} from '../reviewVerdictTypes.js';

import { collectCoverageBlockers } from './utils/collectCoverageBlockers.js';
import { collectDecisionBlockers } from './utils/collectDecisionBlockers.js';
import { collectGroupBlockers } from './utils/collectGroupBlockers.js';
import { collectScopeBlockers } from './utils/collectScopeBlockers.js';
import { finalizeReviewBlockers } from './utils/finalizeReviewBlockers.js';

/**
 * Project existing verdict conditions into one shared, non-executable attention model.
 * @param input Immutable evidence and trusted group snapshot used by the fold.
 * @param coverage Already computed path coverage, including pending obligations.
 * @param joined Already joined decisions and typed exact-set failures.
 * @param verdict Final fold result used only to enforce non-empty INCONCLUSIVE output.
 * @returns Deterministic blocker IDs, routing, advice, and complete source references.
 */
export function buildReviewBlockers(
  input: FoldReviewVerdictInput,
  coverage: ReviewChecklistResult,
  joined: ReviewDecisionJoinResult,
  verdict: ReviewVerdict,
): ReviewBlocker[] {
  const causes: ReviewBlockerCause[] = [
    ...collectScopeBlockers(input.evidence),
    ...collectCoverageBlockers(input, coverage),
    ...collectGroupBlockers(input.groups),
    ...collectDecisionBlockers(input, joined),
  ];
  if (verdict === 'INCONCLUSIVE' && causes.length === 0)
    causes.push({
      kind: 'unclassified',
      scope: { path: null, groupId: null, findingId: null, rule: null },
      detail:
        'The verdict fold is inconclusive, but no typed blocker cause was classified.',
      sources: [{ artifactPath: 'review-state.json' }],
    });
  return finalizeReviewBlockers(causes);
}
