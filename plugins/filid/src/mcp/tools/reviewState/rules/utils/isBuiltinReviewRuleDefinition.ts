import type {
  ReviewRuleDefinition,
  ReviewRuleWhen,
} from '../reviewRuleTypes.js';

/** Built-in conditional selector values accepted by the rule map. */
const SUPPORTED_WHEN = new Set<string>([
  'role:verification',
  'role:document',
  'owner',
] satisfies ReviewRuleWhen[]);

/**
 * Narrow a validated built-in rule record to its runtime definition type.
 * @param value Rule-map record whose detailed diagnostics were checked first.
 * @returns True when every typed field has the built-in rule shape.
 */
export function isBuiltinReviewRuleDefinition(
  value: Record<string, unknown>,
): value is Record<string, unknown> & ReviewRuleDefinition {
  return (
    typeof value.id === 'string' &&
    typeof value.file === 'string' &&
    (value.always === undefined || value.always === true) &&
    (value.match === undefined ||
      (Array.isArray(value.match) &&
        value.match.every((item) => typeof item === 'string'))) &&
    (value.when === undefined ||
      (typeof value.when === 'string' && SUPPORTED_WHEN.has(value.when))) &&
    value.replaces === undefined
  );
}
