import { NODE_TYPES } from './nodeTypes.js';

export const RESTRUCTURE_SCHEMA_VERSION = 1 as const;
export const RESTRUCTURE_PLAN_ID_PREFIX = 'filid-restructure';
export const RESTRUCTURE_PLAN_HASH_SEPARATOR = '\0';
export const RESTRUCTURE_HASH_ALGORITHM = 'sha256';
export const RESTRUCTURE_HASH_ENCODING = 'hex';
export const FINAL_FILE_SUFFIX_PATTERN = /\.[^.]+$/;

export const CONTRACT_INTENTS = {
  INTERNAL: 'internal',
  INDEPENDENT: 'independent',
  UNKNOWN: 'unknown',
} as const;

export const PLACEMENT_BASES = {
  SINGLE_OWNER: 'single-owner',
  LOWEST_COMMON_FRACTAL: 'lowest-common-fractal',
  PUBLIC_CONTRACT: 'public-contract',
  BOUNDARY_RULE: 'boundary-rule',
} as const;

export const REQUIRED_ARTIFACT_ROLES = {
  INTENT_DOCUMENT: 'intent-document',
  DETAIL_DOCUMENT: 'detail-document',
  ENTRY_POINT: 'entry-point',
} as const;

export const RESTRUCTURE_UNIT_KINDS = {
  FILE: 'file',
  ORGAN: 'organ',
  FRACTAL: 'fractal',
} as const;

export const RESTRUCTURE_NODE_TYPES = {
  ORGAN: NODE_TYPES.ORGAN,
  FRACTAL: NODE_TYPES.FRACTAL,
  PURE_FUNCTION: NODE_TYPES.PURE_FUNCTION,
  UNDETERMINED: 'undetermined',
} as const;

export const RESTRUCTURE_DECISION_REASONS = {
  CONTRACT_INTENT_UNKNOWN: 'contract-intent-unknown',
  ORGAN_NAME_REQUIRED: 'organ-name-required',
  ENTRY_POINT_EVIDENCE_REQUIRED: 'entry-point-evidence-required',
  IMPORT_REWRITE_UNSUPPORTED: 'import-rewrite-unsupported',
  CONSUMER_OWNER_REQUIRED: 'consumer-owner-required',
  SOURCE_PATH_OUTSIDE_PROJECT: 'source-path-outside-project',
  CONSUMER_PATH_OUTSIDE_PROJECT: 'consumer-path-outside-project',
  DEPENDENCY_EVIDENCE_INDETERMINATE: 'dependency-evidence-indeterminate',
  INVALID_NAME_HINT: 'invalid-name-hint',
} as const;

export const RESTRUCTURE_VALIDATION_CODES = {
  SNAPSHOT_HASH_MISMATCH: 'snapshot-hash-mismatch',
  PROJECT_ROOT_MISMATCH: 'project-root-mismatch',
  UNRESOLVED_DECISIONS: 'unresolved-decisions',
  SOURCE_STILL_PRESENT: 'source-still-present',
  TARGET_MISSING: 'target-missing',
  TARGET_NODE_TYPE_MISMATCH: 'target-node-type-mismatch',
  REQUIRED_ARTIFACT_MISSING: 'required-artifact-missing',
  ENTRY_POINT_MISSING: 'entry-point-missing',
  IMPORT_REWRITE_MISSING: 'import-rewrite-missing',
  IMPORT_BOUNDARY_VIOLATION: 'import-boundary-violation',
  DEPENDENCY_CYCLE: 'dependency-cycle',
  DEPENDENCY_GRAPH_INDETERMINATE: 'dependency-graph-indeterminate',
} as const;

export const RESTRUCTURE_VALIDATION_MESSAGES = {
  SNAPSHOT_HASH_MISMATCH:
    'The plan snapshot hash does not match the current project snapshot.',
  PROJECT_ROOT_MISMATCH:
    'The plan project root does not match the current project snapshot.',
  UNRESOLVED_DECISIONS:
    'The plan still contains moves that require a placement decision.',
  SOURCE_STILL_PRESENT:
    'The planned source path is still present after execution.',
  TARGET_MISSING: 'The exact planned target path is missing after execution.',
  TARGET_NODE_TYPE_MISMATCH:
    'The planned target container has a different node type.',
  REQUIRED_ARTIFACT_MISSING: 'A required target document artifact is missing.',
  ENTRY_POINT_MISSING:
    'The required adapter-recognized entry point is missing.',
  IMPORT_REWRITE_MISSING:
    'A planned import rewrite is not present in dependency evidence.',
  IMPORT_BOUNDARY_VIOLATION:
    'The post-execution snapshot violates an external import boundary.',
  DEPENDENCY_CYCLE: 'The post-execution dependency graph contains a cycle.',
  DEPENDENCY_GRAPH_INDETERMINATE:
    'The post-execution dependency graph is not exact.',
} as const;

export const RESTRUCTURE_REASON_TEXT = {
  SINGLE_OWNER: 'Place the unit under its only consumer owner.',
  LOWEST_COMMON_FRACTAL:
    'Place the shared unit under the lowest common consumer fractal.',
  PUBLIC_CONTRACT: 'Create an independent fractal for the public contract.',
  DECISION_REQUIRED:
    'Keep the placement unresolved until the recorded decisions are supplied.',
} as const;

export const RESTRUCTURE_REASON_BY_BASIS = {
  [PLACEMENT_BASES.SINGLE_OWNER]: RESTRUCTURE_REASON_TEXT.SINGLE_OWNER,
  [PLACEMENT_BASES.LOWEST_COMMON_FRACTAL]:
    RESTRUCTURE_REASON_TEXT.LOWEST_COMMON_FRACTAL,
  [PLACEMENT_BASES.PUBLIC_CONTRACT]: RESTRUCTURE_REASON_TEXT.PUBLIC_CONTRACT,
  [PLACEMENT_BASES.BOUNDARY_RULE]: RESTRUCTURE_REASON_TEXT.DECISION_REQUIRED,
} as const;
