import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { RecencyFactorConfig, RecencyLevel } from './configTypes.js';
import { isPlainObject } from './isPlainObject.js';

const VALID: ReadonlySet<RecencyLevel> = new Set(['off', 'auto', 'strict']);

function pickLevel(value: unknown, fallback: RecencyLevel): RecencyLevel {
  return typeof value === 'string' && VALID.has(value as RecencyLevel)
    ? (value as RecencyLevel)
    : fallback;
}

export function pickRecencyFactor(raw: unknown): RecencyFactorConfig {
  const defaults = DEFAULT_CONFIG.recency_factor;
  if (!isPlainObject(raw)) return { ...defaults };
  return {
    codex: pickLevel(raw.codex, defaults.codex),
    antigravity: pickLevel(raw.antigravity, defaults.antigravity),
    claude: pickLevel(raw.claude, defaults.claude),
  };
}
