import type { HookConfig } from './configTypes.js';
import { DEFAULTS } from './defaults.js';
import { isObj } from './isObj.js';

export function pickKeywords(raw: unknown): HookConfig['keywords'] {
  if (!isObj(raw)) return DEFAULTS.keywords;
  return {
    gemini:
      typeof raw.gemini === 'string' ? raw.gemini : DEFAULTS.keywords.gemini,
    codex: typeof raw.codex === 'string' ? raw.codex : DEFAULTS.keywords.codex,
  };
}
