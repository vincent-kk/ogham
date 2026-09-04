import type { RenderedReviewUnit } from '../../diff/reviewUnitDiffTypes.js';
import type { ReviewGroup, ReviewUnit } from '../../state/reviewGroupTypes.js';

/**
 * Build a stable path-and-chunk key for one persisted or rendered unit.
 *
 * @param unit Review unit whose persisted identity is compared during resume.
 * @returns NUL-delimited path and chunk-index identity.
 */
function unitKey(unit: ReviewUnit): string {
  return `${unit.path}\0${unit.chunk?.index ?? 0}`;
}

/**
 * Reject a resume whose reconstructed unit facts disagree with canonical state.
 * @param renderedUnits Units deterministically reconstructed from committed Git.
 * @param groups Persisted creation-ordered groups restored from state.
 * @returns Nothing after both unit sets and their immutable facts match.
 * @throws When reconstructed units differ from the persisted group contract.
 */
export function assertRenderedUnitsMatchGroups(
  renderedUnits: readonly RenderedReviewUnit[],
  groups: readonly ReviewGroup[],
): void {
  const persisted = new Map(
    groups.flatMap((group) =>
      group.units.map((unit) => [unitKey(unit), unit] as const),
    ),
  );
  if (persisted.size !== renderedUnits.length)
    throw new Error('Prepared review units do not match committed diffs');
  for (const { unit } of renderedUnits) {
    const prior = persisted.get(unitKey(unit));
    if (
      !prior ||
      JSON.stringify({ ...prior, diffPath: '' }) !== JSON.stringify(unit)
    )
      throw new Error(
        `Prepared review unit changed unexpectedly: ${unit.path}`,
      );
  }
}
