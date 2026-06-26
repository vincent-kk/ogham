/** Inputs that decide whether a search term warrants an ESpell retry. */
export interface ShouldRespellParams {
  /** Total unique hits across the union of all submitted queries. */
  unionTotal: number;
  /** ESearch flagged a probable spelling problem for the term. */
  hasSpellingWarning?: boolean;
  /** Below this union total the result is treated as too thin to trust. */
  threshold?: number;
}

/**
 * Decide whether a term should be re-spelled. Pure predicate: respell when the
 * union came back empty, when ESearch raised a spelling warning, or when the
 * union total sits under the caller-supplied confidence threshold.
 */
export function shouldRespell(params: ShouldRespellParams): boolean {
  const { unionTotal, hasSpellingWarning, threshold } = params;
  if (unionTotal === 0) return true;
  if (hasSpellingWarning === true) return true;
  if (threshold !== undefined && unionTotal < threshold) return true;
  return false;
}
