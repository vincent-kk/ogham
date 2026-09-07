import type { ReviewRuleDefinition } from '../reviewRuleTypes.js';

/**
 * Narrow a validated repository rule record to its runtime definition type.
 * @param value Override record whose detailed diagnostics were checked first.
 * @returns True when every typed field has the repository rule shape.
 */
export function isRepositoryReviewRuleDefinition(
  value: Record<string, unknown>,
): value is Record<string, unknown> & ReviewRuleDefinition {
  return (
    typeof value.id === 'string' &&
    typeof value.file === 'string' &&
    (value.always === undefined || value.always === true) &&
    (value.match === undefined ||
      (Array.isArray(value.match) &&
        value.match.every((item) => typeof item === 'string'))) &&
    value.when === undefined &&
    (value.replaces === undefined ||
      (Array.isArray(value.replaces) &&
        value.replaces.every((item) => typeof item === 'string')))
  );
}
