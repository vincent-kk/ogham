import type { ReviewScopeCandidate } from '../../state/reviewStateTypes.js';

/**
 * Serialize candidates without their ordinal ids, with sorted keys and sorted entries.
 * @param candidates Candidates of one generation.
 * @returns Canonical multiset form of the candidate contents.
 */
function candidateMultiset(
  candidates: readonly ReviewScopeCandidate[],
): string[] {
  return candidates
    .map(({ id: _id, ...content }) =>
      JSON.stringify(
        Object.entries(content).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
    )
    .sort();
}

/**
 * Whether two generations hold the same FCA candidates.
 *
 * The ordinal `FCA-NNN` id and the list order are presentation, so only the
 * multiset of candidate contents counts; a changed severity or certainty, or a
 * candidate that appears or disappears, is a change.
 * @param previous Candidates of the published generation.
 * @param next Candidates computed for the new generation.
 * @returns True when both hold the same candidate contents.
 */
export function sameScopeCandidates(
  previous: readonly ReviewScopeCandidate[],
  next: readonly ReviewScopeCandidate[],
): boolean {
  return (
    JSON.stringify(candidateMultiset(previous)) ===
    JSON.stringify(candidateMultiset(next))
  );
}
