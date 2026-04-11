import type { RuleDocsSyncInput } from '../rule-docs-sync.js';

export function normalizeSelections(
  selections: RuleDocsSyncInput['selections'],
): Record<string, boolean> {
  // Both `undefined` (field absent) and `null` (LLM explicitly passed null)
  // are treated as an empty selection map.
  if (selections === undefined || selections === null) {
    return {};
  }

  let source: unknown = selections;

  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      throw new Error(
        'selections must be a Record<string, boolean> object; received a string that is not valid JSON',
      );
    }
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error(
      'selections must be a Record<string, boolean> object keyed by rule id',
    );
  }

  const normalized: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(source)) {
    normalized[key] = value === true;
  }
  return normalized;
}
