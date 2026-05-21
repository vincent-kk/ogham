import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { ModelAlias } from './configTypes.js';

export function pickModel(v: unknown): ModelAlias {
  if (v === 'high' || v === 'mid' || v === 'low' || v === 'auto') return v;
  return DEFAULT_CONFIG.default_model;
}
