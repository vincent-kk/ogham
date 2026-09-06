import type { ReviewGroup } from '../../state/reviewGroupTypes.js';

/**
 * Identify review content independently of execution policy and artifact locations.
 * @param group Assignment whose rounds, risk hints, validation, and diff paths may change.
 * @returns Stable serialized identity used to preserve paid review results safely.
 */
export function resolveReviewGroupIdentity(group: ReviewGroup): string {
  const {
    rounds: _rounds,
    validated: _validated,
    riskReasons: _riskReasons,
    units,
    ...identity
  } = group;
  return JSON.stringify({
    ...identity,
    units: units.map(({ diffPath: _diffPath, ...unit }) => unit),
  });
}
