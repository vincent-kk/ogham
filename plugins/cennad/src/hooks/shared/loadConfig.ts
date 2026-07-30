import { join } from 'node:path';

import { mergeConfigLayers } from '@ogham/cross-platform';

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

/**
 * The routing policy in effect, read without zod. Same two layers and same
 * precedence as `core/configManager`: the user layer under `CENNAD_HOME`,
 * overridden by `<cwd>/.cennad/config.json`.
 *
 * The project root is `process.cwd()` rather than a resolved workspace — the
 * host launches hooks inside the workspace, and resolving it properly would
 * pull the host-paths graph into a 10 KB bundle. Only `config-scope/merge`
 * is added, which imports no node builtin.
 */
export function loadConfig(): HookConfig {
  const user =
    readConfigObject(CONFIG_PATH) ??
    (CONFIG_PATH === FALLBACK_CONFIG_PATH
      ? null
      : readConfigObject(FALLBACK_CONFIG_PATH));
  const project = readConfigObject(
    join(process.cwd(), '.cennad', 'config.json'),
  );
  if (user === null && project === null) return DEFAULT_CONFIG;

  const config = mergeConfigLayers(user, project);
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
