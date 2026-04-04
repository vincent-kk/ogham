export const RULE_ERROR_PROBABILITY: Record<string, number> = {
  'circular-dependency': 0.95,
  'pure-function-isolation': 0.9,
  'organ-no-intentmd': 0.85,
  'max-depth': 0.8,
  'zero-peer-file': 0.75,
  'index-barrel-pattern': 0.6,
  'module-entry-point': 0.55,
  'naming-convention': 0.2,
};

export const SEVERITY_FALLBACK: Record<string, number> = {
  CRITICAL: 0.95,
  HIGH: 0.85,
  MEDIUM: 0.5,
  LOW: 0.2,
};

export const DEFAULT_ERROR_PROBABILITY = 0.5;

export const AUTO_FIXABLE_RULES = new Set([
  'naming-convention',
  'index-barrel-pattern',
  'module-entry-point',
]);

export const MAX_REVIEW_ITEMS = 5;
