import type { ReviewGroup } from '../../state/reviewGroupTypes.js';

/**
 * Identify review content independently of execution policy and artifact locations.
 * @param group Assignment whose rounds, planning policy, risk hints, validation, and diff paths are not content identity.
 * @returns Stable serialized identity used to preserve paid review results safely.
 */
export function resolveReviewGroupIdentity(group: ReviewGroup): string {
  const {
    rounds: _rounds,
    validated: _validated,
    riskReasons: _riskReasons,
    planRequired: _planRequired,
    units,
    ...identity
  } = group;
  return JSON.stringify({
    ...identity,
    units: units.map(({ diffPath: _diffPath, ...unit }) => unit),
  });
}
