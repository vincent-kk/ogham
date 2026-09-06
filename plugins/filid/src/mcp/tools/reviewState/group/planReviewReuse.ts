import type {
  ReviewGroupReuseDecision,
  ReviewReuseCandidate,
  ReviewReuseSummary,
} from '../state/reviewIncrementalTypes.js';

import { invalidateReviewDependencies } from './invalidateReviewDependencies.js';
import { resolveReviewReuseReasons } from './resolveReviewReuseReasons.js';

/** Observations required to plan one generation without performing IO. */
interface PlanReviewReuseInput {
  /** Complete origin roster, including removed groups. */
  previous: readonly ReviewReuseCandidate[];
  /** Current roster and current semantic input observations. */
  current: readonly ReviewReuseCandidate[];
  /** Explicitly discard reuse eligibility while preserving origin artifacts. */
  force?: boolean;
}

/**
 * Decide reuse from input equality and artifact trust, then propagate changes.
 * @param input Current and origin observations; no actor-selected group list.
 * @returns Deterministic decisions and independently countable work estimates.
 * @throws When a roster contains duplicate display IDs.
 */
export function planReviewReuse(input: PlanReviewReuseInput): {
  decisions: ReviewGroupReuseDecision[];
  summary: ReviewReuseSummary;
} {
  const { current, previous } = input;
  for (const roster of [current, previous])
    if (
      roster.some(
        (group, index) =>
          roster.findIndex((entry) => entry.id === group.id) !== index,
      )
    )
      throw new Error('duplicate review group ID');
  const direct = current.map((group): ReviewGroupReuseDecision => {
    const matches = previous.filter(
      (entry) => group.input && entry.input?.groupKey === group.input.groupKey,
    );
    const ambiguous =
      matches.length > 1 ||
      current.filter(
        (entry) =>
          group.input && entry.input?.groupKey === group.input.groupKey,
      ).length > 1;
    const origin = matches.length === 1 && !ambiguous ? matches[0] : null;
    if (group.rounds === 0)
      return {
        group: group.id,
        previousGroup: origin?.id ?? null,
        disposition: 'bookkeeping',
        reasons: [],
      };
    const reasons = input.force
      ? ['forced' as const]
      : ambiguous
        ? ['composition-changed' as const]
        : origin
          ? resolveReviewReuseReasons(group, origin)
          : ['composition-changed' as const];
    return {
      group: group.id,
      previousGroup: origin?.id ?? null,
      disposition:
        !origin && !ambiguous ? 'new' : reasons.length ? 'rerun' : 'reused',
      reasons,
    };
  });
  const decisions = invalidateReviewDependencies(current, previous, direct);
  return {
    decisions,
    summary: {
      reusedGroups: decisions.filter((entry) => entry.disposition === 'reused')
        .length,
      rerunGroups: decisions.filter((entry) => entry.disposition === 'rerun')
        .length,
      newGroups: decisions.filter((entry) => entry.disposition === 'new')
        .length,
      removedGroups: previous.filter(
        (group) =>
          group.rounds > 0 &&
          !current.some(
            (entry) =>
              group.input && entry.input?.groupKey === group.input.groupKey,
          ),
      ).length,
      bookkeepingGroups: decisions.filter(
        (entry) => entry.disposition === 'bookkeeping',
      ).length,
      remainingMaxReviewerHandoffs: current.reduce(
        (total, group, index) =>
          total +
          (decisions[index].disposition === 'reused' ? 0 : group.rounds),
        0,
      ),
    },
  };
}
