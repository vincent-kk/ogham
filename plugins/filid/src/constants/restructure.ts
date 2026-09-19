import { NODE_TYPES } from './nodeTypes.js';

export const RESTRUCTURE_SCHEMA_VERSION = 2 as const;
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
  CONSUMER_OWNER_REQUIRED: 'consumer-owner-required',
  SOURCE_PATH_OUTSIDE_PROJECT: 'source-path-outside-project',
  CONSUMER_PATH_OUTSIDE_PROJECT: 'consumer-path-outside-project',
  DEPENDENCY_EVIDENCE_INDETERMINATE: 'dependency-evidence-indeterminate',
  INVALID_NAME_HINT: 'invalid-name-hint',
  MOVE_ORDER_CONFLICT: 'move-order-conflict',
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
  DELEGATED_IMPORT_MISSING: 'delegated-import-missing',
  PRESERVED_IMPORT_BROKEN: 'preserved-import-broken',
  IMPORT_BOUNDARY_VIOLATION: 'import-boundary-violation',
  DEPENDENCY_CYCLE: 'dependency-cycle',
  DEPENDENCY_GRAPH_INDETERMINATE: 'dependency-graph-indeterminate',
} as const;

export const RESTRUCTURE_REASON_TEXT = {
  SINGLE_OWNER: 'Place the unit under its only consumer owner.',
  LOWEST_COMMON_FRACTAL:
    'Place the shared unit under the lowest common consumer fractal.',
  PUBLIC_CONTRACT: 'Create an independent fractal for the public contract.',
  DECISION_REQUIRED:
    'Unresolved until every entry of decisions is settled; each names its next action.',
} as const;

export const RESTRUCTURE_REASON_BY_BASIS = {
  [PLACEMENT_BASES.SINGLE_OWNER]: RESTRUCTURE_REASON_TEXT.SINGLE_OWNER,
  [PLACEMENT_BASES.LOWEST_COMMON_FRACTAL]:
    RESTRUCTURE_REASON_TEXT.LOWEST_COMMON_FRACTAL,
  [PLACEMENT_BASES.PUBLIC_CONTRACT]: RESTRUCTURE_REASON_TEXT.PUBLIC_CONTRACT,
  [PLACEMENT_BASES.BOUNDARY_RULE]: RESTRUCTURE_REASON_TEXT.DECISION_REQUIRED,
} as const;

/** Snapshot diagnostic code of a local import that resolves to no file; postcondition reads it for delegated imports. */
export const UNRESOLVED_IMPORT_DIAGNOSTIC_CODE = 'unresolved-local-dependency';

/** Summary next actions of the restructure plan action, chosen by status and plan contents. */
export const RESTRUCTURE_PLAN_NEXT_ACTIONS = {
  UNSUPPORTED:
    "Filid cannot analyze this project's dependencies, so it cannot plan or verify a restructure here; report the requests as unsupported.",
  UNRESOLVED:
    'Do not execute this plan: settle each unresolved entry by its decisions[].nextAction, then create a new plan.',
  DIAGNOSTICS:
    "Do not execute this plan: this response carries diagnostics (evidence gaps, document findings or configuration warnings). Follow each diagnostic's nextAction, then create a new plan.",
  NOTHING_TO_MOVE:
    "Nothing to move. Call precondition with this plan's artifact path, create any missing requiredArtifacts of the alreadyPlaced requests, then call postcondition to confirm each one is in place.",
  READY:
    "Call restructure precondition with this plan's artifact path. After approval, run moves in listed order — creating each move's requiredArtifacts — then apply affectedImports, rewrite each delegatedImports entry yourself so it loads its requiredResolvedPath, and call postcondition.",
} as const;

/** Summary next actions of the plan validation actions, keyed by action and then by status. */
export const RESTRUCTURE_VALIDATION_NEXT_ACTIONS = {
  precondition: {
    ok: "Present the plan for approval. Then run moves in listed order — creating each move's requiredArtifacts — apply affectedImports, rewrite each delegatedImports entry yourself, and call postcondition with the same artifact.",
    violations: "Do not execute this plan: follow each finding's nextAction.",
    indeterminate:
      "Do not execute this plan: this response carries diagnostics (evidence gaps, document findings or configuration warnings). Follow each diagnostic's nextAction and each finding's nextAction, then create a new plan.",
  },
  postcondition: {
    ok: 'Restructure verified: report it complete with the number of moves applied.',
    violations:
      "Restructure not verified: follow each finding's nextAction, then run postcondition again. Report it as failed until it passes.",
    indeterminate:
      "Restructure not verified: this response carries diagnostics (evidence gaps, document findings or configuration warnings). Follow each diagnostic's nextAction and each finding's nextAction, then run postcondition again.",
  },
} as const;

/** Next actions of the plan artifact errors, keyed like `RESTRUCTURE_PLAN_ERROR_CODES`. */
export const RESTRUCTURE_PLAN_ERROR_NEXT_ACTIONS = {
  PLAN_PATH_NOT_ABSOLUTE:
    'Pass the absolute artifact path that the plan action returned.',
  PLAN_ARTIFACT_NOT_FOUND:
    'Pass the artifact path that the plan action returned; if that artifact is gone, create a new plan.',
  PLAN_ARTIFACT_INVALID:
    'Create a new plan with this filid version and validate its artifact; never edit a plan artifact by hand.',
} as const;
