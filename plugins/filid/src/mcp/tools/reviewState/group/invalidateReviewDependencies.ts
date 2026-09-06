import type {
  ReviewGroupReuseDecision,
  ReviewReuseCandidate,
} from '../state/reviewIncrementalTypes.js';

/**
 * Propagate invalid producers, changed edges and cycles to their consumers.
 * @param current Current generation's complete roster.
 * @param previous Previous generation's complete roster.
 * @param decisions Direct decisions, copied before dependency reasons are added.
 * @returns Decisions in current roster order with transitive invalidation.
 */
export function invalidateReviewDependencies(
  current: readonly ReviewReuseCandidate[],
  previous: readonly ReviewReuseCandidate[],
  decisions: readonly ReviewGroupReuseDecision[],
): ReviewGroupReuseDecision[] {
  const resolved = decisions.map((decision) => ({
    ...decision,
    reasons: [...decision.reasons],
  }));
  const proven = new Set<string>();
  for (let pass = 0; pass < current.length; pass++)
    for (const group of current) {
      const decision = resolved.find((entry) => entry.group === group.id)!;
      if (decision.disposition !== 'reused' || proven.has(group.id)) continue;
      const origin = previous.find(
        (entry) => entry.id === decision.previousGroup,
      );
      const originKeys = origin?.dependsOn
        .map((id) => previous.find((entry) => entry.id === id)?.input?.groupKey)
        .sort();
      const currentKeys = group.dependsOn
        .map((id) => current.find((entry) => entry.id === id)?.input?.groupKey)
        .sort();
      if (
        currentKeys.some((key) => !key) ||
        originKeys?.some((key) => !key) ||
        JSON.stringify(currentKeys) !== JSON.stringify(originKeys)
      )
        continue;
      if (group.dependsOn.every((id) => proven.has(id))) proven.add(group.id);
    }
  for (const group of current) {
    const decision = resolved.find((entry) => entry.group === group.id)!;
    if (group.rounds === 0) continue;
    if (
      !group.dependsOn.every((id) => proven.has(id)) ||
      (decision.disposition === 'reused' && !proven.has(group.id))
    ) {
      decision.reasons.push('dependency-invalidated');
      if (decision.disposition === 'reused') decision.disposition = 'rerun';
    }
  }
  return resolved;
}
