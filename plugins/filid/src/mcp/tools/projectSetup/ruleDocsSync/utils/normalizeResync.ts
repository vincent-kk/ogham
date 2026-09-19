import { RULE_DOC_SYNC_DIAGNOSTIC_CODES } from '../../../../../constants/mcpContracts.js';
import { ToolDiagnosticError } from '../../../../errors/toolDiagnosticError.js';
import type { RuleDocsSyncInput } from '../ruleDocsSync.js';

const RESYNC_NEXT_ACTION =
  'Pass resync as an array of rule id strings, or a JSON string encoding that array, then call again.';

/**
 * Defensive normaliser for the `resync` field. Mirrors the shape tolerance
 * of {@link normalizeSelections}: accepts `string[]`, JSON-encoded
 * `string[]`, `null`, or `undefined`.
 *
 * Returns a deduplicated string array. Throws with a descriptive message when
 * the input cannot be parsed as a string array.
 */
export function normalizeResync(resync: RuleDocsSyncInput['resync']): string[] {
  if (resync === undefined || resync === null) return [];

  let source: unknown = resync;

  if (typeof source === 'string')
    try {
      source = JSON.parse(source);
    } catch {
      throw new ToolDiagnosticError(
        RULE_DOC_SYNC_DIAGNOSTIC_CODES.RESYNC_INVALID,
        `resync must be a string array; received a non-JSON string: "${String(resync).slice(0, 50)}"`,
        RESYNC_NEXT_ACTION,
      );
    }

  if (!Array.isArray(source))
    throw new ToolDiagnosticError(
      RULE_DOC_SYNC_DIAGNOSTIC_CODES.RESYNC_INVALID,
      'resync must be a string array of rule ids',
      RESYNC_NEXT_ACTION,
    );

  const seen = new Set<string>();
  for (const entry of source) {
    if (typeof entry !== 'string')
      throw new ToolDiagnosticError(
        RULE_DOC_SYNC_DIAGNOSTIC_CODES.RESYNC_INVALID,
        'resync entries must be strings (rule ids)',
        RESYNC_NEXT_ACTION,
      );
    seen.add(entry);
  }
  return [...seen];
}
