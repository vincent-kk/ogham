/**
 * @file pipeline.ts
 * @description Pipeline phase and lifecycle constants
 */
import type { PhaseName } from '../types/state.js';

/** Ordered sequence of pipeline phases */
export const PHASE_ORDER: readonly PhaseName[] = [
  'validate',
  'split',
  'devplan',
] as const;

/** Environment variable name for debug mode */
export const DEBUG_ENV_VAR = 'IMBAS_DEBUG';

/** Logger tag prefix */
export const LOGGER_PREFIX = 'imbas';
