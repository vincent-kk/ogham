export const BUILTIN_RULE_IDS = {
  NAMING_CONVENTION: 'naming-convention',
  ORGAN_NO_INTENTMD: 'organ-no-intentmd',
  INDEX_BARREL_PATTERN: 'index-barrel-pattern',
  MODULE_ENTRY_POINT: 'module-entry-point',
  MAX_DEPTH: 'max-depth',
  CIRCULAR_DEPENDENCY: 'circular-dependency',
  PURE_FUNCTION_ISOLATION: 'pure-function-isolation',
  ZERO_PEER_FILE: 'zero-peer-file',
} as const;

export type BuiltinRuleId =
  (typeof BUILTIN_RULE_IDS)[keyof typeof BUILTIN_RULE_IDS];
