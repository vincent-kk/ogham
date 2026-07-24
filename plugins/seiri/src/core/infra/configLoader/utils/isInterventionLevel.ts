import { INTERVENTION_LEVELS } from '../../../../constants/intervention.js';
import type { InterventionLevel } from '../../../../types/config.js';

/**
 * Narrow an unknown value to a dial position.
 *
 * Deliberately hand-rolled rather than schema-backed: this predicate is on
 * the SessionStart hook's path, and hook bundles must not carry a
 * validation runtime. One enum of three strings does not need one.
 */
export function isInterventionLevel(
  value: unknown,
): value is InterventionLevel {
  return (
    typeof value === 'string' &&
    (INTERVENTION_LEVELS as readonly string[]).includes(value)
  );
}
