export const BUILTIN_RULE_IDS = {
  INTENT_DOCUMENT_CONTRACT: 'intent-document-contract',
  DETAIL_DOCUMENT_CONTRACT: 'detail-document-contract',
  ORGAN_NO_INTENTMD: 'organ-no-intentmd',
  ENTRY_POINT_SURFACE: 'entry-point-surface',
  MODULE_ENTRY_POINT: 'module-entry-point',
  MAX_DEPTH: 'max-depth',
  CIRCULAR_DEPENDENCY: 'circular-dependency',
  PURE_FUNCTION_ISOLATION: 'pure-function-isolation',
  ZERO_PEER_FILE: 'zero-peer-file',
  EXTERNAL_IMPORT_BOUNDARY: 'external-import-boundary',
  SPEC_DOCUMENT_CASE_CAP: 'spec-document-case-cap',
  TEST_RECORD_CASE_CAP: 'test-record-case-cap',
  SPEC_FRAGMENTATION: 'spec-fragmentation',
  SPEC_CONTRACT_LINK: 'spec-contract-link',
  LEGACY_CRITERIA_LEDGER: 'legacy-criteria-ledger',
} as const;

export type BuiltinRuleId =
  (typeof BUILTIN_RULE_IDS)[keyof typeof BUILTIN_RULE_IDS];
