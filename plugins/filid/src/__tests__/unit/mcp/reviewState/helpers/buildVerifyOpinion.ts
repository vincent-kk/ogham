import type { ReviewStateRecord } from '../../../../../mcp/tools/reviewState/state/reviewStateTypes.js';

/** JSON-compatible verifier decision fixture fields. */
interface VerifyDecisionFixture {
  /** Reviewer or FCA finding identifier being decided. */
  findingId: string;
  /** Required verifier verdict. */
  verdict: string;
  /** Concrete evidence supporting the verdict. */
  evidence: string;
  /** Falsifiable reason for the verdict. */
  reason: string;
}

/**
 * Build one structurally valid verifier artifact for a prepared group.
 *
 * @param state Prepared state supplying immutable source identity.
 * @param group At-least-two-digit prepared group identifier.
 * @param decisions Exact reviewer and FCA decisions required by the brief.
 * @returns Mutable JSON-compatible verifier opinion fixture.
 */
export function buildVerifyOpinion(
  state: ReviewStateRecord,
  group: string,
  decisions: readonly VerifyDecisionFixture[],
): Record<string, unknown> {
  return {
    schema: 7,
    group,
    state: 'COMPLETE',
    sourceHash: state.sourceHash,
    decisions: decisions.map((decision) => ({ ...decision })),
    observations: [],
    checked: decisions.map(({ findingId }) => findingId),
  };
}
