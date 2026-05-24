import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { PreambleConfig } from './configTypes.js';
import { isObj } from './isObj.js';

export function pickPreamble(raw: unknown): PreambleConfig {
  const defaults = DEFAULT_CONFIG.preamble;
  if (!isObj(raw)) return { ...defaults };
  return {
    gemini: typeof raw.gemini === 'string' ? raw.gemini : defaults.gemini,
    codex: typeof raw.codex === 'string' ? raw.codex : defaults.codex,
  };
}
