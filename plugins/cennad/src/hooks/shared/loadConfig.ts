import { DEFAULT_CONFIG } from '../../constants/defaults.js';

import type { HookConfig } from './configTypes.js';
import { isPlainObject } from './isPlainObject.js';
import { CONFIG_PATH, FALLBACK_CONFIG_PATH } from './paths.js';
import { pickKeywords } from './pickKeywords.js';
import { pickOptionFlags } from './pickOptionFlags.js';
import { pickPreamble } from './pickPreamble.js';
import { pickRatio } from './pickRatio.js';
import { pickRecencyFactor } from './pickRecencyFactor.js';
import { pickStrength } from './pickStrength.js';
import { safeReadJson } from './safeReadJson.js';

export function loadConfig(): HookConfig {
  const config =
    readConfigObject(CONFIG_PATH) ??
    (CONFIG_PATH === FALLBACK_CONFIG_PATH
      ? null
      : readConfigObject(FALLBACK_CONFIG_PATH));
  if (config === null) return DEFAULT_CONFIG;
  return {
    ratio: pickRatio(config.ratio),
    intervention_strength: pickStrength(config.intervention_strength),
    keywords: pickKeywords(config.keywords),
    option_flags: pickOptionFlags(config.option_flags),
    preamble: pickPreamble(config.preamble),
    recency_factor: pickRecencyFactor(config.recency_factor),
  };
}

function readConfigObject(path: string): Record<string, unknown> | null {
  const config = safeReadJson(path);
  return isPlainObject(config) ? config : null;
}
