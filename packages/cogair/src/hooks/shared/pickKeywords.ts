import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { HookConfig } from './configTypes.js';
import { isObj } from './isObj.js';

export function pickKeywords(raw: unknown): HookConfig['keywords'] {
  if (!isObj(raw)) return DEFAULT_CONFIG.keywords;
  return {
    gemini:
      typeof raw.gemini === 'string'
        ? raw.gemini
        : DEFAULT_CONFIG.keywords.gemini,
    codex:
      typeof raw.codex === 'string' ? raw.codex : DEFAULT_CONFIG.keywords.codex,
  };
}
