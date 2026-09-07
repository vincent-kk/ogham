/**
 * Build the canonical reviewer finding shared by seal verdict fixtures.
 *
 * @param group At-least-two-digit prepared group identifier.
 * @returns JSON-compatible error finding located in the fixture diff.
 */
export function buildReviewStateSealFinding(
  group: string,
): Record<string, unknown> {
  return {
    id: `R${group}-001`,
    severity: 'error',
    category: 'bug',
    path: 'src/value.ts',
    existingCode: 'export const value = 2;',
    lines: 'unknown',
    rule: 'DEF-1',
    message: 'The exported value is defective.',
    evidence: 'src/value.ts:1',
    consequence: 'Consumers observe the wrong value.',
    recommendedAction: 'Restore the intended exported value.',
  };
}
