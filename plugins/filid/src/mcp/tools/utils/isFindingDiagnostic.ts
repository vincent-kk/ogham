import { BUILTIN_RULE_IDS } from '../../../constants/builtinRuleIds.js';
import type { ToolDiagnostic } from '../../../types/toolEnvelope.js';

/**
 * Diagnostic codes that carry a rule finding rather than missing evidence.
 * A document-contract diagnostic restates a violation the validator already
 * reports; it means the evidence was read, not that it could not be obtained.
 */
const FINDING_DIAGNOSTIC_CODES: ReadonlySet<string> = new Set([
  BUILTIN_RULE_IDS.INTENT_DOCUMENT_CONTRACT,
  BUILTIN_RULE_IDS.DETAIL_DOCUMENT_CONTRACT,
]);

/**
 * Decide whether a diagnostic reports a finding instead of unusable evidence.
 * @param diagnostic Diagnostic emitted by the snapshot or config loader.
 * @returns true when the diagnostic restates a rule finding and therefore must
 *   not lower analysis certainty.
 */
export function isFindingDiagnostic(diagnostic: ToolDiagnostic): boolean {
  return FINDING_DIAGNOSTIC_CODES.has(diagnostic.code);
}
