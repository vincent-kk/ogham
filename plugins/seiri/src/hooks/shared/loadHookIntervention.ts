import { DISABLED_INTERVENTION } from '../../constants/intervention.js';
import { loadIntervention } from '../../core/infra/configLoader/loaders/loadIntervention.js';
import type { InterventionState } from '../../types/config.js';

/**
 * Resolve the hook dial once and convert full disablement into a skip.
 *
 * @param cwd Project working directory whose intervention layers apply.
 * @returns The active hook state, or undefined when hooks are disabled.
 */
export function loadHookIntervention(
  cwd: string,
): InterventionState | undefined {
  const intervention = loadIntervention(cwd);
  return intervention.effective === DISABLED_INTERVENTION
    ? undefined
    : intervention;
}
