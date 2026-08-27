import { RULE_SCOPES } from './ruleScopes.js';

export const MCP_SERVER_NAME = 'filid';
export const STRUCTURE_PLAN_PATH_REQUIRED_MESSAGE =
  'planPath is required for plan validation modes';

export const FRACTAL_SCAN_DETAILS = {
  SUMMARY: 'summary',
  PATHS: 'paths',
  FULL: 'full',
} as const;

export const VERIFICATION_SCAN_DETAILS = {
  SUMMARY: 'summary',
  FILES: 'files',
} as const;

export const STRUCTURE_VALIDATION_MODES = {
  PROJECT: 'project',
  PLAN_PRECONDITION: 'plan-precondition',
  PLAN_POSTCONDITION: 'plan-postcondition',
} as const;

export const STRUCTURE_VALIDATION_SCOPES = {
  DOCUMENTS: RULE_SCOPES.DOCUMENTS,
  NODES: RULE_SCOPES.NODES,
  ENTRY_POINTS: RULE_SCOPES.ENTRY_POINTS,
  BOUNDARIES: RULE_SCOPES.BOUNDARIES,
  DAG: RULE_SCOPES.DAG,
  VERIFICATION: RULE_SCOPES.VERIFICATION,
} as const;
export const STRUCTURE_VALIDATION_SCOPE_VALUES = Object.values(
  STRUCTURE_VALIDATION_SCOPES,
);

export const RULE_DOC_ACTIONS = {
  STATUS: 'status',
  SYNC: 'sync',
  MANIFEST: 'manifest',
} as const;

export const RULE_DOC_DIAGNOSTIC_CODES = {
  PLUGIN_ROOT_UNRESOLVED: 'rule-docs-plugin-root-unresolved',
} as const;

export const RULE_DOC_DIAGNOSTIC_MESSAGES = {
  PLUGIN_ROOT_UNRESOLVED: 'Filid plugin root could not be resolved.',
} as const;

export const RULE_DOC_INPUT_ERROR_MESSAGES = {
  INPUT_REQUIRED: 'input object is required',
  PATH_REQUIRED: 'path is required',
  ACTION_REQUIRED: 'action is required (status | sync | manifest)',
} as const;

export const RULE_DOC_UNRESOLVED_MANIFEST_SKIPPED = [
  {
    id: '*',
    reason: 'plugin root could not be resolved',
  },
] as const;

export const VERIFICATION_ROLES = {
  SPEC_DOCUMENT: 'spec-document',
  TEST_RECORD: 'test-record',
} as const;

export const SNAPSHOT_TOOL_DIAGNOSTIC_CODES = {
  CONFIG_WARNING: 'config-warning',
  VERIFICATION_PATH_NOT_FOUND: 'verification-path-not-found',
} as const;

export const SNAPSHOT_TOOL_DIAGNOSTIC_MESSAGES = {
  VERIFICATION_PATH_NOT_FOUND:
    'Requested path is absent from snapshot verification evidence.',
} as const;

export const CONTEXT_RESOLVE_DIAGNOSTIC_CODES = {
  TARGET_UNRESOLVED: 'context-target-unresolved',
} as const;

export const STRUCTURE_VALIDATION_ERROR_MESSAGES = {
  PLAN_PATH_REQUIRED: STRUCTURE_PLAN_PATH_REQUIRED_MESSAGE,
  PLAN_PATH_ABSOLUTE: 'planPath must be an absolute machine path',
  PLAN_ARTIFACT_NOT_FOUND: 'plan artifact does not exist',
  PLAN_ARTIFACT_INVALID: 'plan artifact is not a valid RestructurePlan',
} as const;

export const MCP_TOOL_DESCRIPTIONS = {
  PROJECT_INIT: 'Initialize Filid project configuration.',
  RULE_DOCS_SYNC: 'Inspect or synchronize managed Filid rule documents.',
  OPEN_SETTINGS: 'Open the bounded local Filid settings workflow.',
  FRACTAL_SCAN: 'Summarize a snapshot-backed FCA project tree.',
  CONTEXT_RESOLVE:
    'Resolve ordered owner-to-root document chains from one shared snapshot.',
  RESTRUCTURE_PLAN: 'Create a persisted read-only structure placement plan.',
  STRUCTURE_VALIDATE: 'Validate project structure or plan conditions.',
  VERIFICATION_SCAN: 'Evaluate verification document policy evidence.',
  REVIEW_STATE: 'Manage cross-review artifact lifecycle state.',
} as const;
