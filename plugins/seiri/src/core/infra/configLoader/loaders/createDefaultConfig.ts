import { DEFAULT_INTERVENTION } from '../../../../constants/intervention.js';
import type { SeiriConfig } from '../../../../types/config.js';

/**
 * The config the settings page proposes to a project that has none yet.
 *
 * `off` is the default so installing seiri exposes its skills without
 * silently enabling hook-driven workflow chaining. A project opts into
 * advisory, standard, or strict behaviour explicitly.
 */
export function createDefaultConfig(): SeiriConfig {
  return { intervention: DEFAULT_INTERVENTION };
}
