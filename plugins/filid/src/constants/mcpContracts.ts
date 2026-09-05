import { RULE_SCOPES } from './ruleScopes.js';

/** Name advertised by the Filid MCP server. */
export const MCP_SERVER_NAME = 'filid';

/** Detail projections supported by the inspection scan action. */
export const FRACTAL_SCAN_DETAILS = {
  SUMMARY: 'summary',
  PATHS: 'paths',
  FULL: 'full',
} as const;

/** Detail projections supported by the inspection verification action. */
export const VERIFICATION_SCAN_DETAILS = {
  SUMMARY: 'summary',
  FILES: 'files',
} as const;

/** Stable summary modes emitted by structure validation results. */
export const STRUCTURE_VALIDATION_MODES = {
  PROJECT: 'project',
  PLAN_PRECONDITION: 'plan-precondition',
  PLAN_POSTCONDITION: 'plan-postcondition',
} as const;

/** Canonical FCA rule scopes exposed by validation actions. */
export const STRUCTURE_VALIDATION_SCOPES = {
  DOCUMENTS: RULE_SCOPES.DOCUMENTS,
  NODES: RULE_SCOPES.NODES,
  ENTRY_POINTS: RULE_SCOPES.ENTRY_POINTS,
  BOUNDARIES: RULE_SCOPES.BOUNDARIES,
  DAG: RULE_SCOPES.DAG,
  VERIFICATION: RULE_SCOPES.VERIFICATION,
} as const;
/** Ordered values of every canonical structure-validation scope. */
export const STRUCTURE_VALIDATION_SCOPE_VALUES = Object.values(
  STRUCTURE_VALIDATION_SCOPES,
);

/** Internal child actions supported by managed rule synchronization. */
export const RULE_DOC_ACTIONS = {
  STATUS: 'status',
  SYNC: 'sync',
  MANIFEST: 'manifest',
} as const;

/** Public actions exposed by the project-setup dispatcher. */
export const PROJECT_SETUP_ACTIONS = {
  INIT: 'init',
  RULES_STATUS: 'rules-status',
  RULES_MANIFEST: 'rules-manifest',
  RULES_SYNC: 'rules-sync',
  SETTINGS: 'settings',
} as const;

/** Maps public project-setup rule actions to their child action values. */
export const PROJECT_SETUP_RULE_DOC_ACTION_BY_ACTION = {
  [PROJECT_SETUP_ACTIONS.RULES_STATUS]: RULE_DOC_ACTIONS.STATUS,
  [PROJECT_SETUP_ACTIONS.RULES_MANIFEST]: RULE_DOC_ACTIONS.MANIFEST,
  [PROJECT_SETUP_ACTIONS.RULES_SYNC]: RULE_DOC_ACTIONS.SYNC,
} as const;

/** Public actions exposed by the fractal-inspection dispatcher. */
export const FRACTAL_INSPECT_ACTIONS = {
  SCAN: 'scan',
  VALIDATE: 'validate',
  VERIFICATION: 'verification',
  RESOLVE: 'resolve',
} as const;

/** Public actions exposed by the restructure dispatcher. */
export const RESTRUCTURE_ACTIONS = {
  PLAN: 'plan',
  PRECONDITION: 'precondition',
  POSTCONDITION: 'postcondition',
} as const;

/** Maps restructure validation actions to stable summary mode values. */
export const RESTRUCTURE_VALIDATION_MODE_BY_ACTION = {
  [RESTRUCTURE_ACTIONS.PRECONDITION]:
    STRUCTURE_VALIDATION_MODES.PLAN_PRECONDITION,
  [RESTRUCTURE_ACTIONS.POSTCONDITION]:
    STRUCTURE_VALIDATION_MODES.PLAN_POSTCONDITION,
} as const;

/** Stable diagnostic codes emitted by managed rule actions. */
export const RULE_DOC_DIAGNOSTIC_CODES = {
  PLUGIN_ROOT_UNRESOLVED: 'rule-docs-plugin-root-unresolved',
} as const;

/** Stable diagnostic messages emitted by managed rule actions. */
export const RULE_DOC_DIAGNOSTIC_MESSAGES = {
  PLUGIN_ROOT_UNRESOLVED: 'Filid plugin root could not be resolved.',
} as const;

/** Stable trust-boundary errors owned by the rule-doc child. */
export const RULE_DOC_INPUT_ERROR_MESSAGES = {
  INPUT_REQUIRED: 'input object is required',
  PATH_REQUIRED: 'path is required',
  ACTION_REQUIRED: 'action is required (status | sync | manifest)',
} as const;

/** Fallback skipped row returned when the plugin root is unavailable. */
export const RULE_DOC_UNRESOLVED_MANIFEST_SKIPPED = [
  {
    id: '*',
    reason: 'plugin root could not be resolved',
  },
] as const;

/** Verification-document roles recognized by Filid. */
export const VERIFICATION_ROLES = {
  SPEC_DOCUMENT: 'spec-document',
  TEST_RECORD: 'test-record',
} as const;

/** Stable diagnostic codes shared by snapshot-backed actions. */
export const SNAPSHOT_TOOL_DIAGNOSTIC_CODES = {
  CONFIG_WARNING: 'config-warning',
  VERIFICATION_PATH_NOT_FOUND: 'verification-path-not-found',
} as const;

/** Stable diagnostic messages shared by snapshot-backed actions. */
export const SNAPSHOT_TOOL_DIAGNOSTIC_MESSAGES = {
  VERIFICATION_PATH_NOT_FOUND:
    'Requested path is absent from snapshot verification evidence.',
} as const;

/** Stable diagnostic codes emitted by context resolution. */
export const CONTEXT_RESOLVE_DIAGNOSTIC_CODES = {
  TARGET_UNRESOLVED: 'context-target-unresolved',
} as const;

/** Stable trust-boundary errors emitted while reading restructure plans. */
export const STRUCTURE_VALIDATION_ERROR_MESSAGES = {
  PLAN_PATH_ABSOLUTE: 'planPath must be an absolute machine path',
  PLAN_ARTIFACT_NOT_FOUND: 'plan artifact does not exist',
  PLAN_ARTIFACT_INVALID: 'plan artifact is not a valid RestructurePlan',
} as const;

/** Human-readable descriptions advertised for each public MCP tool. */
export const MCP_TOOL_DESCRIPTIONS = {
  PROJECT_SETUP:
    'Initialize Filid config, inspect or sync managed rule documents, or open the bounded local settings session.',
  FRACTAL_INSPECT:
    'Read-only FCA inspection from one snapshot: tree scan, structural validation, verification-document audit, or owner-chain resolution.',
  RESTRUCTURE:
    'Plan a read-only placement move, then check its preconditions and postconditions around an external actor.',
  REVIEW_STATE:
    'Manage cross-review artifact lifecycle state and collect changed-scope FCA evidence.',
} as const;
