/**
 * Require one decision for each expected ID and reject duplicates on either side.
 * @param expectedIds Assigned candidate and trusted merged-finding identifiers.
 * @param decisionIds Identifiers from independent and deterministic decisions together.
 * @returns Whether both collections are the same duplicate-free ID set.
 */
export function hasExactDecisionCoverage(
  expectedIds: readonly string[],
  decisionIds: readonly string[],
): boolean {
  const expected = new Set(expectedIds);
  return (
    expected.size === expectedIds.length &&
    decisionIds.length === expectedIds.length &&
    new Set(decisionIds).size === decisionIds.length &&
    decisionIds.every((id) => expected.has(id))
  );
}
