export const REVIEW_STATE_SCHEMA_VERSION = 1 as const;
export const REVIEW_STATE_HASH_ALGORITHM = 'sha256';
export const REVIEW_STATE_HASH_ENCODING = 'hex';
export const REVIEW_STATE_HASH_SEPARATOR = '\0';
export const REVIEW_STATE_HASH_VERSION = 'filid-review-state-v1';
export const REVIEW_STATE_DELETED_FILE_HASH = 'DELETED';
export const REVIEW_STATE_BRANCH_READABLE_LIMIT = 80;
export const REVIEW_STATE_GIT_TIMEOUT_MS = 30_000;
export const REVIEW_STATE_JSON_INDENT = 2;
export const REVIEW_STATE_JSON_TRAILING_NEWLINE = '\n';
export const REVIEW_STATE_BRANCH_FALLBACK_NAME = 'branch';
export const REVIEW_STATE_BRANCH_KEY_SEPARATOR = '-';
export const REVIEW_STATE_UNSAFE_BRANCH_PATTERN = /[^A-Za-z0-9._-]+/g;
export const REVIEW_STATE_EDGE_PUNCTUATION_PATTERN = /^[.-]+|[.-]+$/g;
export const REVIEW_STATE_CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
export const REVIEW_STATE_PATH_SEPARATOR_PATTERN = /[\\/]/;
export const REVIEW_STATE_CURRENT_SEGMENT = '.';
export const REVIEW_STATE_TRAVERSAL_SEGMENT = '..';

export const REVIEW_STATE_GIT = {
  BINARY: 'git',
  HEAD: 'HEAD',
  MERGE_BASE: 'merge-base',
  DIFF: 'diff',
  LS_TREE: 'ls-tree',
  END_OF_OPTIONS: '--',
  RANGE_SEPARATOR: '..',
  RECORD_SEPARATOR: '\0',
  METADATA_PATH_SEPARATOR: '\t',
  IDENTITY_SEPARATOR: ' ',
} as const;

export const REVIEW_STATE_GIT_ARGUMENTS = {
  DIFF_COMMITTED_PATHS: ['--name-only', '-z', '--no-renames'],
  HEAD_TREE: ['-rz', '--full-tree'],
} as const;

export const REVIEW_STATE_ACTIONS = {
  PREPARE: 'prepare',
  CHECKPOINT: 'checkpoint',
  SEAL: 'seal',
  CLEANUP: 'cleanup',
} as const;

export const REVIEW_STATE_ACTION_VALUES = Object.values(REVIEW_STATE_ACTIONS);

export const REVIEW_STATE_PHASES = {
  PREPARED: 'prepared',
  SEALED: 'sealed',
} as const;

export const REVIEW_STATE_PHASE_VALUES = Object.values(REVIEW_STATE_PHASES);

export const REVIEW_STATE_DISPOSITIONS = {
  FRESH: 'fresh',
  RESUMABLE: 'resumable',
  CACHED: 'cached',
  STALE: 'stale',
  MISSING: 'missing',
  SEALED: 'sealed',
  CLEANED: 'cleaned',
} as const;

export const REVIEW_STATE_DIRECTORY_NAMES = {
  FILID: '.filid',
  REVIEW: 'review',
  OPINIONS: 'opinions',
} as const;

export const REVIEW_STATE_FILE_NAMES = {
  STATE: 'review-state.json',
  REPORT: 'review-report.md',
  SESSION: 'session.md',
  VERIFICATION: 'verification.md',
  VERIFICATION_METRICS_PARTIAL: 'verification.metrics-half.partial.md',
  VERIFICATION_STRUCTURE_PARTIAL: 'verification.structure-half.partial.md',
  STRUCTURE_CHECK: 'structure-check.md',
  FIX_REQUESTS: 'fix-requests.md',
} as const;

export const REVIEW_STATE_STALE_ARTIFACT_FILE_NAMES = [
  REVIEW_STATE_FILE_NAMES.REPORT,
  REVIEW_STATE_FILE_NAMES.SESSION,
  REVIEW_STATE_FILE_NAMES.VERIFICATION,
  REVIEW_STATE_FILE_NAMES.VERIFICATION_METRICS_PARTIAL,
  REVIEW_STATE_FILE_NAMES.VERIFICATION_STRUCTURE_PARTIAL,
  REVIEW_STATE_FILE_NAMES.STRUCTURE_CHECK,
  REVIEW_STATE_FILE_NAMES.FIX_REQUESTS,
] as const;

export const REVIEW_STATE_STALE_ARTIFACT_DIRECTORY_NAMES = [
  REVIEW_STATE_DIRECTORY_NAMES.OPINIONS,
] as const;

export const REVIEW_STATE_DIAGNOSTIC_CODES = {
  STATE_MISSING: 'review-state-missing',
  SOURCE_HASH_STALE: 'review-source-hash-stale',
  REPORT_MISSING: 'review-report-missing',
} as const;

export const REVIEW_STATE_DIAGNOSTIC_MESSAGES = {
  STATE_MISSING: 'No prepared review state exists for this branch.',
  SOURCE_HASH_STALE:
    'Committed source content no longer matches the prepared review state.',
  REPORT_MISSING: 'The canonical review report is missing.',
} as const;

export const REVIEW_STATE_ERROR_MESSAGES = {
  INPUT_OBJECT_REQUIRED: 'review_state input must be an object',
  ACTION_INVALID: 'action must be prepare, checkpoint, seal, or cleanup',
  PROJECT_ROOT_REQUIRED: 'projectRoot is required',
  BRANCH_NAME_REQUIRED: 'branchName is required',
  BASE_REF_REQUIRED: 'baseRef is required for prepare',
  CLEANUP_CONFIRM_REQUIRED: 'confirm must be true for cleanup',
  BRANCH_NAME_INVALID:
    'branchName must be a non-empty, non-traversal branch identifier',
  STATE_INVALID: 'Invalid review state record',
  TREE_RECORD_INVALID: 'git ls-tree returned an invalid NUL-delimited record',
  TREE_IDENTITY_INCOMPLETE: 'git ls-tree returned incomplete tree identity',
  MERGE_BASE_MISSING: 'No merge base found',
} as const;

export const REVIEW_STATE_REQUIRED_STRING_FIELDS = [
  'projectRoot',
  'branchName',
  'normalizedBranch',
  'baseRef',
  'baseCommit',
  'sourceHash',
  'preparedAt',
] as const;
