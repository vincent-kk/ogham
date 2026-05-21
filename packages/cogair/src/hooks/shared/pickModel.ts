import type { ModelAlias } from './configTypes.js';
import { DEFAULTS } from './defaults.js';

export function pickModel(v: unknown): ModelAlias {
  if (v === 'high' || v === 'mid' || v === 'low' || v === 'auto') return v;
  return DEFAULTS.default_model;
}
