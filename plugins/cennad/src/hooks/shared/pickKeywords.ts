import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { HookConfig } from './configTypes.js';
import { isPlainObject } from './isPlainObject.js';

export function pickKeywords(raw: unknown): HookConfig['keywords'] {
  if (!isPlainObject(raw)) return DEFAULT_CONFIG.keywords;
  return {
    codex:
      typeof raw.codex === 'string' ? raw.codex : DEFAULT_CONFIG.keywords.codex,
    antigravity:
      typeof raw.antigravity === 'string'
        ? raw.antigravity
        : DEFAULT_CONFIG.keywords.antigravity,
    claude:
      typeof raw.claude === 'string'
        ? raw.claude
        : DEFAULT_CONFIG.keywords.claude,
  };
}
