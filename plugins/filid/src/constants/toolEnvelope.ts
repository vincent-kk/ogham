import { ANALYSIS_CERTAINTIES } from './analysisCertainties.js';

export const TOOL_STATUSES = {
  OK: 'ok',
  VIOLATIONS: 'violations',
  INDETERMINATE: ANALYSIS_CERTAINTIES.INDETERMINATE,
  UNSUPPORTED: ANALYSIS_CERTAINTIES.UNSUPPORTED,
} as const;

export const TOOL_PERSISTENCE = {
  ON_OVERFLOW: 'on-overflow',
  ALWAYS: 'always',
} as const;

export const TOOL_MEDIA_TYPES = {
  JSON: 'application/json',
  NDJSON: 'application/x-ndjson',
  MARKDOWN: 'text/markdown',
} as const;

export const TOOL_CONTENT_TYPES = {
  TEXT: 'text',
} as const;

export const TOOL_INLINE_BUDGET_BYTES = 16 * 1024;
export const TOOL_ARTIFACT_PLUGIN_NAME = 'filid';
export const TOOL_ARTIFACT_DIRECTORY = 'artifacts';
export const TOOL_ARTIFACT_FILE_SUFFIX = '.json';
export const TOOL_ARTIFACT_HASH_ALGORITHM = 'sha256';
export const TOOL_ARTIFACT_HASH_ENCODING = 'hex';
export const TOOL_ARTIFACT_TEXT_ENCODING = 'utf8';
export const TOOL_ARTIFACT_EPHEMERAL = true as const;

export const TOOL_ERROR_DIAGNOSTIC_CODE = 'tool-execution-error';
/**
 * Input rejected by the tool's schema. Distinct from execution failure: the
 * caller can fix this one by resending, and it says nothing about whether the
 * ecosystem is supported — which is what the shared `unsupported` status means.
 */
export const TOOL_INPUT_DIAGNOSTIC_CODE = 'tool-input-invalid';
export const TOOL_ARTIFACT_DIAGNOSTIC_CODE = 'tool-diagnostics-in-artifact';
export const TOOL_ARTIFACT_DIAGNOSTIC_MESSAGE =
  'Full diagnostics are available in the referenced artifact.';
export const TOOL_ERROR_SUMMARY = {
  failed: true,
} as const;
export const TOOL_SERIALIZATION_ERROR_MESSAGE =
  'Tool payload could not be serialized.';
export const TOOL_INLINE_ENVELOPE_BUDGET_ERROR_MESSAGE =
  'Tool summary and artifact metadata exceed the inline response budget.';
