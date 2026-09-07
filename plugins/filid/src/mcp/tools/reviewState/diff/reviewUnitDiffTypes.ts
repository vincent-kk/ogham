import type { ReviewUnit } from '../state/reviewGroupTypes.js';

/** Transient rendered bytes paired with the state unit they describe. */
export interface RenderedReviewUnit {
  /** Unit identity and hunk ranges persisted after grouping. */
  unit: ReviewUnit;
  /** Complete path-scoped unified diff for only this unit. */
  diffText: string;
}

/** Inputs for contained, optionally idempotent unit-diff materialization. */
export interface MaterializeUnitDiffsInput {
  /** Canonical branch review directory. */
  reviewDirectory: string;
  /** Groups in deterministic creation order. */
  groups: readonly import('../state/reviewGroupTypes.js').ReviewGroup[];
  /** Rendered unit bytes produced before grouping assigned artifact paths. */
  renderedUnits: readonly RenderedReviewUnit[];
  /** Preserve existing bytes and write only absent diff artifacts. */
  onlyMissing?: boolean;
}
