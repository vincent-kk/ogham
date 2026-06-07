import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { HookConfig } from './configTypes.js';
import { isObj } from './isObj.js';
import { CONFIG_PATH } from './paths.js';
import { pickKeywords } from './pickKeywords.js';
import { pickModel } from './pickModel.js';
import { pickOptionFlags } from './pickOptionFlags.js';
import { pickPreamble } from './pickPreamble.js';
import { pickRatio } from './pickRatio.js';
import { pickRecencyFactor } from './pickRecencyFactor.js';
import { pickStrength } from './pickStrength.js';
import { safeReadJson } from './safeReadJson.js';

export function loadConfig(): HookConfig {
  const raw = safeReadJson(CONFIG_PATH);
  if (!isObj(raw)) return DEFAULT_CONFIG;
  return {
    ratio: pickRatio(raw.ratio),
    intervention_strength: pickStrength(raw.intervention_strength),
    keywords: pickKeywords(raw.keywords),
    default_model: pickModel(raw.default_model),
    option_flags: pickOptionFlags(raw.option_flags),
    preamble: pickPreamble(raw.preamble),
    recency_factor: pickRecencyFactor(raw.recency_factor),
  };
}
