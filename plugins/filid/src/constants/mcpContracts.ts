import { FACTS_TOOL_DESCRIPTION } from './facts.js';
import { RULE_SCOPES } from './ruleScopes.js';

/** Name advertised by the Filid MCP server. */
export const MCP_SERVER_NAME = 'filid';

/** Tool-name prefix Claude Code gives the plugin's `tools` server; skills and actor methods spell this one. */
export const CLAUDE_MCP_TOOL_PREFIX = `mcp__plugin_${MCP_SERVER_NAME}_tools__`;

/** Tool-name prefix Codex gives the plugin's single server, keyed by the plugin name in the Codex manifest. */
export const CODEX_MCP_TOOL_PREFIX = `mcp__${MCP_SERVER_NAME}__`;

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
  PLUGIN_ROOT_UNRESOLVED:
    'Filid plugin root could not be resolved, so managed rule documents cannot be read or synced.',
} as const;

/** Next actions of the managed rule diagnostics, keyed like their codes. */
export const RULE_DOC_DIAGNOSTIC_NEXT_ACTIONS = {
  PLUGIN_ROOT_UNRESOLVED:
    'Run from an installed filid plugin, where the host sets CLAUDE_PLUGIN_ROOT, or reinstall the plugin, then retry; report to the user if it persists.',
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

/** Diagnostic codes for caller-input errors normalized by rule-doc sync. */
export const RULE_DOC_SYNC_DIAGNOSTIC_CODES = {
  SELECTION_INVALID: 'setup-selection-invalid',
  RESYNC_INVALID: 'setup-resync-invalid',
} as const;

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
    'Requested path is absent from snapshot verification evidence:',
} as const;

/** Next actions of the diagnostics shared by snapshot-backed actions. */
export const SNAPSHOT_TOOL_DIAGNOSTIC_NEXT_ACTIONS = {
  CONFIG_WARNING:
    'Fix the entry the message names in the filid configuration layer that holds it (the project .filid/config.json or the user-level filid config); filid skipped it and used its default for this run.',
  VERIFICATION_PATH_NOT_FOUND:
    'Pass a verification file inside the project; call fractal_inspect with action "verification" and no filePaths to list the files filid recognizes.',
} as const;

/** Stable diagnostic codes emitted by context resolution. */
export const CONTEXT_RESOLVE_DIAGNOSTIC_CODES = {
  TARGET_UNRESOLVED: 'context-target-unresolved',
} as const;

/** Next actions of the context-resolution diagnostics, keyed like their codes. */
export const CONTEXT_RESOLVE_DIAGNOSTIC_NEXT_ACTIONS = {
  TARGET_UNRESOLVED:
    "Pass a path inside the project's fractal tree, relative to path or absolute, then call again.",
} as const;

/** Stable diagnostic codes of the trust-boundary errors raised while reading restructure plans. */
export const RESTRUCTURE_PLAN_ERROR_CODES = {
  PLAN_PATH_NOT_ABSOLUTE: 'plan-path-not-absolute',
  PLAN_ARTIFACT_NOT_FOUND: 'plan-artifact-not-found',
  PLAN_ARTIFACT_INVALID: 'plan-artifact-invalid',
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
    'Manage cross-review artifact lifecycle state, collect changed-scope FCA evidence, and generate the PR handoff section.',
  FACTS: FACTS_TOOL_DESCRIPTION,
} as const;
