import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import type { PreambleConfig } from '../../../types/index.js';

import { isPlainObject } from './isPlainObject.js';

export function mergePreamble(raw: unknown): PreambleConfig {
  const defaults = DEFAULT_CONFIG.preamble;
  if (!isPlainObject(raw)) return { ...defaults };
  return {
    gemini: typeof raw.gemini === 'string' ? raw.gemini : defaults.gemini,
    codex: typeof raw.codex === 'string' ? raw.codex : defaults.codex,
  };
}
