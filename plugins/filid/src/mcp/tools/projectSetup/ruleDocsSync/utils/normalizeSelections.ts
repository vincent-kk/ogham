import { RULE_DOC_SYNC_DIAGNOSTIC_CODES } from '../../../../../constants/mcpContracts.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
import type { RuleDocsSyncInput } from '../ruleDocsSync.js';

/**
 * Normalizes object or JSON-string rule selections into a boolean map.
 *
 * @param selections - Defensive selection shape accepted at the child boundary.
 * @returns A normalized rule-ID selection map.
 * @throws When a supplied value cannot represent an object map.
 */
export function normalizeSelections(
  selections: RuleDocsSyncInput['selections'],
): Record<string, boolean> {
  // Both `undefined` (field absent) and `null` (LLM explicitly passed null)
  // are treated as an empty selection map.
  if (selections === undefined || selections === null) return {};

  let source: unknown = selections;

  if (typeof source === 'string')
    try {
      source = JSON.parse(source);
    } catch {
      throw new ToolDiagnosticError(
        RULE_DOC_SYNC_DIAGNOSTIC_CODES.SELECTION_INVALID,
        'selections must be a Record<string, boolean> object; received a string that is not valid JSON',
        'Pass selections as an object keyed by rule id with boolean values, or a JSON string encoding that object, then call again.',
      );
    }

  if (!source || typeof source !== 'object' || Array.isArray(source))
    throw new ToolDiagnosticError(
      RULE_DOC_SYNC_DIAGNOSTIC_CODES.SELECTION_INVALID,
      'selections must be a Record<string, boolean> object keyed by rule id',
      'Pass selections as an object keyed by rule id with boolean values, then call again.',
    );

  const normalized: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(source))
    normalized[key] = value === true;

  return normalized;
}
