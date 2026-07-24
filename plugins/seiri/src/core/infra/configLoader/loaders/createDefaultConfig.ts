import { DEFAULT_INTERVENTION } from '../../../../constants/intervention.js';
import type { SeiriConfig } from '../../../../types/config.js';

/**
 * The config the settings page proposes to a project that has none yet.
 *
 * `standard` is the default on purpose: opting into seiri should turn the
 * workflow chain on without a second decision. A project that wants seiri
 * to stay quiet dials down to the silent floor — the default leans toward
 * the posture most projects that reach for seiri are asking for.
 */
export function createDefaultConfig(): SeiriConfig {
  return { intervention: DEFAULT_INTERVENTION };
}
