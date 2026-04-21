import type { RuleDocsSyncInput } from '../rule-docs-sync.js';

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

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      throw new Error(
        `resync must be a string array; received a non-JSON string: "${String(resync).slice(0, 50)}"`,
      );
    }
  }

  if (!Array.isArray(source))
    throw new Error('resync must be a string array of rule ids');

  const seen = new Set<string>();
  for (const entry of source) {
    if (typeof entry !== 'string')
      throw new Error('resync entries must be strings (rule ids)');
    seen.add(entry);
  }
  return [...seen];
}
