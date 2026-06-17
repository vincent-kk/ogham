import { DEFAULT_CONFIG } from '../../../constants/defaults.js';
import type {
  AddonsConfig,
  YoutubeAddonLanguage,
} from '../../../types/index.js';

import { isPlainObject } from './isPlainObject.js';

function asLanguage(
  value: unknown,
  fallback: YoutubeAddonLanguage,
): YoutubeAddonLanguage {
  return value === 'en' || value === 'ko' ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

// Merge raw.addons with defaults. When no `addons` block exists yet, migrate the
// legacy `antigravity_youtube: { enabled }` shape: that toggle only ever provisioned
// antigravity, so it maps to targets.antigravity and leaves codex off.
export function mergeAddons(
  rawAddons: unknown,
  legacyAntigravityYoutube: unknown,
): AddonsConfig {
  const dy = DEFAULT_CONFIG.addons.youtube;

  if (isPlainObject(rawAddons) && isPlainObject(rawAddons.youtube)) {
    const y = rawAddons.youtube;
    const t = isPlainObject(y.targets) ? y.targets : {};
    return {
      youtube: {
        enabled: asBool(y.enabled, dy.enabled),
        language: asLanguage(y.language, dy.language),
        targets: {
          codex: asBool(t.codex, dy.targets.codex),
          antigravity: asBool(t.antigravity, dy.targets.antigravity),
        },
      },
    };
  }

  if (isPlainObject(legacyAntigravityYoutube)) {
    return {
      youtube: {
        enabled: asBool(legacyAntigravityYoutube.enabled, false),
        language: dy.language,
        targets: { codex: false, antigravity: true },
      },
    };
  }

  return {
    youtube: {
      enabled: dy.enabled,
      language: dy.language,
      targets: { ...dy.targets },
    },
  };
}
