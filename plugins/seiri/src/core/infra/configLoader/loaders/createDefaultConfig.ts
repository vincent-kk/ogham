import { DEFAULT_INTERVENTION } from '../../../../constants/intervention.js';
import type { SeiriConfig } from '../../../../types/config.js';

/**
 * The config a project gets before it has written one of its own.
 *
 * `advisory` is the floor on purpose: seiri owns context, not judgment, so
 * a project that never opted into anything must not find itself under a
 * stronger intervention than it asked for.
 */
export function createDefaultConfig(): SeiriConfig {
  return { intervention: DEFAULT_INTERVENTION };
}
