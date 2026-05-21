import type { HookConfig } from './configTypes.js';
import { DEFAULTS } from './defaults.js';
import { isObj } from './isObj.js';
import { CONFIG_PATH } from './paths.js';
import { pickKeywords } from './pickKeywords.js';
import { pickModel } from './pickModel.js';
import { pickRatio } from './pickRatio.js';
import { pickStrength } from './pickStrength.js';
import { safeReadJson } from './safeReadJson.js';

export function loadConfig(): HookConfig {
  const raw = safeReadJson(CONFIG_PATH);
  if (!isObj(raw)) return DEFAULTS;
  return {
    ratio: pickRatio(raw.ratio),
    intervention_strength: pickStrength(raw.intervention_strength),
    keywords: pickKeywords(raw.keywords),
    default_model: pickModel(raw.default_model),
    default_options: isObj(raw.default_options)
      ? raw.default_options
      : DEFAULTS.default_options,
  };
}
