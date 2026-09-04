import type { ReviewGroup } from '../../../../../mcp/tools/reviewState/state/reviewGroupTypes.js';
import type { ReviewStateRecord } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/**
 * Build one structurally valid reviewer artifact for a prepared group.
 *
 * @param state Prepared state supplying immutable source identity.
 * @param group Prepared group supplying the exact unit roster.
 * @param round One-based review round represented by the artifact.
 * @returns Mutable JSON-compatible reviewer opinion fixture.
 */
export function buildReviewOpinion(
  state: ReviewStateRecord,
  group: ReviewGroup,
  round = 1,
): Record<string, unknown> {
  return {
    schema: 7,
    group: group.id,
    round,
    state: 'COMPLETE',
    sourceHash: state.sourceHash,
    files: group.units.map((unit) => ({
      path: unit.path,
      change: unit.change,
      chunk: unit.chunk ? `${unit.chunk.index}/${unit.chunk.total}` : null,
      result: 'reviewed',
      reason: null,
    })),
    findings: [],
    checked: group.units.map((unit) => unit.path),
    gaps: [],
    riskPlan: null,
  };
}
