import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { RecencyFactorConfig, RecencyLevel } from './configTypes.js';
import { isObj } from './isObj.js';

const VALID: ReadonlySet<RecencyLevel> = new Set(['off', 'auto', 'strict']);

function pickLevel(value: unknown, fallback: RecencyLevel): RecencyLevel {
  return typeof value === 'string' && VALID.has(value as RecencyLevel)
    ? (value as RecencyLevel)
    : fallback;
}

export function pickRecencyFactor(raw: unknown): RecencyFactorConfig {
  const defaults = DEFAULT_CONFIG.recency_factor;
  if (!isObj(raw)) return { ...defaults };
  return {
    gemini: pickLevel(raw.gemini, defaults.gemini),
    codex: pickLevel(raw.codex, defaults.codex),
    antigravity: pickLevel(raw.antigravity, defaults.antigravity),
  };
}
