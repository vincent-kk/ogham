import { REVIEW_OPINION_SCHEMA_VERSION } from '../../../../constants/reviewState.js';
import type { ReviewGroup } from '../state/reviewGroupTypes.js';

/**
 * Render a review round's machine-writable opinion skeleton.
 * @param group Deterministic group whose units become pending file rows.
 * @param sourceHash Immutable committed-source identity.
 * @param round One-based review round represented by the skeleton.
 * @returns Two-space JSON with one trailing newline.
 */
export function renderOpinionSkeleton(
  group: ReviewGroup,
  sourceHash: string,
  round = 1,
): string {
  return `${JSON.stringify(
    {
      schema: REVIEW_OPINION_SCHEMA_VERSION,
      group: group.id,
      round,
      state: 'INDETERMINATE',
      sourceHash,
      files: group.units.map((unit) => ({
        path: unit.path,
        change: unit.change,
        chunk: unit.chunk ? `${unit.chunk.index}/${unit.chunk.total}` : null,
        result: 'pending',
        reason: null,
      })),
      findings: [],
      checked: [],
      gaps: [],
      riskPlan: null,
    },
    null,
    2,
  )}\n`;
}
