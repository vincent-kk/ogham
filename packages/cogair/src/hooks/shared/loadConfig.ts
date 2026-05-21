import type {
  HookConfig,
  InterventionStrength,
  ModelAlias,
  ProviderRatio,
  Ratio,
} from './configTypes.js';
import { CONFIG_PATH } from './paths.js';
import { safeReadJson } from './safeReadJson.js';

const DEFAULTS: HookConfig = {
  ratio: {
    gemini: { value: 50, enabled: true },
    codex: { value: 50, enabled: true },
  },
  intervention_strength: 0,
  keywords: {
    gemini: 'research, search, youtube, large-context',
    codex: 'code, refactor, sandbox',
  },
  default_model: 'auto',
  default_options: {},
};

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function pickProviderRatio(
  raw: unknown,
  fallback: ProviderRatio,
): ProviderRatio {
  if (!isObj(raw)) return fallback;
  const rawValue = raw.value;
  const rawEnabled = raw.enabled;
  const value =
    typeof rawValue === 'number' && Number.isFinite(rawValue)
      ? Math.max(0, Math.min(100, Math.round(rawValue)))
      : fallback.value;
  const enabled =
    typeof rawEnabled === 'boolean' ? rawEnabled : fallback.enabled;
  return { value, enabled };
}

function pickRatio(raw: unknown): Ratio {
  if (!isObj(raw)) return DEFAULTS.ratio;
  const g = raw.gemini;
  const c = raw.codex;

  // Legacy integer weights (pre-percentage schema): convert to percentages +
  // enabled flags. Matches the migration in core/configManager/loadConfig.
  if (typeof g === 'number' && typeof c === 'number') {
    const gw = Math.max(0, Math.floor(g));
    const cw = Math.max(0, Math.floor(c));
    const total = gw + cw;
    if (total === 0) return DEFAULTS.ratio;
    const gPct = Math.round((gw / total) * 100);
    return {
      gemini: { value: gPct, enabled: gw > 0 },
      codex: { value: 100 - gPct, enabled: cw > 0 },
    };
  }

  return {
    gemini: pickProviderRatio(g, DEFAULTS.ratio.gemini),
    codex: pickProviderRatio(c, DEFAULTS.ratio.codex),
  };
}

function pickStrength(v: unknown): InterventionStrength {
  if (v === -2 || v === -1 || v === 0 || v === 1 || v === 2) return v;
  return DEFAULTS.intervention_strength;
}

function pickModel(v: unknown): ModelAlias {
  if (v === 'high' || v === 'mid' || v === 'low' || v === 'auto') return v;
  return DEFAULTS.default_model;
}

function pickKeywords(raw: unknown): HookConfig['keywords'] {
  if (!isObj(raw)) return DEFAULTS.keywords;
  return {
    gemini:
      typeof raw.gemini === 'string' ? raw.gemini : DEFAULTS.keywords.gemini,
    codex: typeof raw.codex === 'string' ? raw.codex : DEFAULTS.keywords.codex,
  };
}

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
