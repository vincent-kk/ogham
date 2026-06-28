import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import type { PreambleConfig } from '../../../types/index.js';

import { isPlainObject } from './isPlainObject.js';

export function mergePreamble(raw: unknown): PreambleConfig {
  const defaults = DEFAULT_CONFIG.preamble;
  if (!isPlainObject(raw)) return { ...defaults };
  return {
    codex: typeof raw.codex === 'string' ? raw.codex : defaults.codex,
    antigravity:
      typeof raw.antigravity === 'string'
        ? raw.antigravity
        : defaults.antigravity,
  };
}
