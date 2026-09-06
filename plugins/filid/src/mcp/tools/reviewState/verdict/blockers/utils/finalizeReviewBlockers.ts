import type { ReviewResolutionAdvice } from '../../../opinion/reviewResolutionAdvice.js';
import type {
  ReviewBlocker,
  ReviewBlockerCause,
} from '../../reviewVerdictTypes.js';

/**
 * Deduplicate exact causes without losing sources or competing attention proposals.
 * @param causes Typed occurrences collected from the same immutable verdict input.
 * @returns Stable review-local identifiers and explicit missing/conflicting-advice routes.
 */
export function finalizeReviewBlockers(
  causes: readonly ReviewBlockerCause[],
): ReviewBlocker[] {
  const grouped = new Map<string, ReviewBlockerCause[]>();
  for (const cause of causes) {
    const { kind, scope, detail } = cause;
    const key = JSON.stringify([
      kind,
      scope.path,
      scope.rule,
      scope.findingId,
      detail,
      kind === 'artifact-trust' || kind === 'verifier-indeterminate'
        ? scope.groupId
        : null,
    ]);
    grouped.set(key, [...(grouped.get(key) ?? []), cause]);
  }
  return [...grouped]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, occurrences], index): ReviewBlocker => {
      const first = occurrences[0]!;
      const variants = new Map<string, ReviewResolutionAdvice>();
      for (const { resolution } of occurrences)
        if (resolution)
          variants.set(
            JSON.stringify([
              resolution.question,
              resolution.evidenceNeeded,
              resolution.nextAction,
              resolution.doneWhen,
              resolution.suggestedOwner,
              resolution.humanReason,
            ]),
            resolution,
          );
      const alternatives = [...variants]
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([, advice]) => advice);
      const fallback: ReviewResolutionAdvice = {
        question: `What evidence would resolve ${first.scope.rule?.slice(0, 80) ?? first.kind}?`,
        evidenceNeeded: [
          'The original record does not identify a complete resolution proposal.',
        ],
        nextAction:
          alternatives.length > 1
            ? 'Compare the preserved proposals and identify the evidence needed to choose between them.'
            : 'Identify the missing evidence and an appropriate reviewer within the permitted scope.',
        doneWhen:
          'The unresolved question has a conclusive answer supported by validated evidence in a new review.',
        suggestedOwner: 'unknown',
      };
      const resolution =
        alternatives.length === 1 ? alternatives[0]! : fallback;
      const sourceEntries = occurrences
        .flatMap((cause) => cause.sources)
        .map(
          (source) =>
            [
              JSON.stringify([
                source.artifactPath,
                source.pointer,
                source.anchor,
              ]),
              source,
            ] as const,
        );
      const sources = [...new Map(sourceEntries)]
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([, source]) => source);
      return {
        ...first,
        id: `BLK-${String(index + 1).padStart(3, '0')}`,
        scope: {
          ...first.scope,
          groupId: occurrences.every(
            (cause) => cause.scope.groupId === first.scope.groupId,
          )
            ? first.scope.groupId
            : null,
        },
        sources,
        resolution,
        attention:
          resolution.suggestedOwner === 'human'
            ? 'human-decision'
            : resolution.suggestedOwner === 'agent'
              ? 'evidence-recovery'
              : 'triage',
        adviceSource:
          alternatives.length > 1
            ? 'conflict'
            : alternatives.length === 0
              ? 'missing'
              : (occurrences.find((cause) => cause.resolution)?.adviceSource ??
                'actor'),
        alternativeResolutions: alternatives.length > 1 ? alternatives : [],
      };
    });
}
