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
  DIFF_COMMITTED_STATUS: ['--name-status', '-z', '--no-renames'],
  DIFF_COMMITTED_NUMSTAT: ['--numstat', '-z', '--no-renames'],
  HEAD_TREE: ['-rz', '--full-tree'],
  STATUS_PORCELAIN: ['status', '--porcelain', '-z'],
  UPSTREAM_COUNT: ['rev-list', '--count', '@{upstream}..HEAD'],
  REMOTE_HEAD: ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'],
  VERIFY_REF: ['rev-parse', '--verify', '--quiet'],
} as const;

export const REVIEW_STATE_ACTIONS = {
  PREPARE: 'prepare',
  CHECKPOINT: 'checkpoint',
  SCOPE: 'scope',
  SEAL: 'seal',
  CLEANUP: 'cleanup',
  ASSESS: 'assess',
} as const;

/** Where a merge-track cycle resumes, read from files and git state alone. */
export const REVIEW_ENTRY_STAGES = {
  PR_CREATE: 'pr-create',
  REVIEW: 'review',
  RESOLVE: 'resolve',
  REVALIDATE: 'revalidate',
  COMPLETE: 'complete',
} as const;

/** Class a single dirty path falls into; the first matching test wins. */
export const WORKTREE_PATH_CLASSES = {
  DOCUMENT: 'document',
  GENERATED: 'generated',
  SOURCE: 'source',
} as const;

/** Summary of the classes present in a dirty worktree. */
export const WORKTREE_DISPOSITIONS = {
  CLEAN: 'clean',
  DOCUMENTS_ONLY: 'documents-only',
  GENERATED_ONLY: 'generated-only',
  SOURCE_DIRTY: 'source-dirty',
} as const;

/** Base refs tried in order once the remote HEAD lookup fails. */
export const REVIEW_BASE_REF_CANDIDATES = [
  'origin/main',
  'origin/master',
] as const;

/** Segment wildcard in `structure.generatedPaths`; matches exactly one segment. */
export const GENERATED_PATH_WILDCARD = '*';

/** Separator for the repository-relative paths git reports. */
export const REVIEW_PATH_SEGMENT_SEPARATOR = '/';

/** Git status codes whose record is followed by the rename or copy source. */
export const RENAME_STATUS_CODES = ['R', 'C'] as const;

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
  SCOPED: 'scoped',
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
  EVIDENCE: 'evidence.md',
  SESSION: 'session.md',
  VERIFICATION: 'verification.md',
  VERIFICATION_METRICS_PARTIAL: 'verification.metrics-half.partial.md',
  VERIFICATION_STRUCTURE_PARTIAL: 'verification.structure-half.partial.md',
  STRUCTURE_CHECK: 'structure-check.md',
  FIX_REQUESTS: 'fix-requests.md',
  JUSTIFICATIONS: 'justifications.md',
  RE_VALIDATE: 're-validate.md',
} as const;

export const REVIEW_STATE_STALE_ARTIFACT_FILE_NAMES = [
  REVIEW_STATE_FILE_NAMES.REPORT,
  REVIEW_STATE_FILE_NAMES.SESSION,
  REVIEW_STATE_FILE_NAMES.EVIDENCE,
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
  STATE_SEALED: 'review-state-sealed',
  REPORT_MISSING: 'review-report-missing',
} as const;

export const REVIEW_STATE_DIAGNOSTIC_MESSAGES = {
  STATE_MISSING: 'No prepared review state exists for this branch.',
  SOURCE_HASH_STALE:
    'Committed source content no longer matches the prepared review state.',
  STATE_SEALED: 'A sealed review state cannot be scoped again.',
  REPORT_MISSING: 'The canonical review report is missing.',
} as const;

/** Schema version rendered in canonical cross-review evidence. */
export const REVIEW_EVIDENCE_SCHEMA_VERSION = 6 as const;

/** Maximum dirty paths returned inline by the scope action. */
export const REVIEW_SCOPE_DIRTY_PATH_LIMIT = 20;

export const REVIEW_STATE_ERROR_MESSAGES = {
  INPUT_OBJECT_REQUIRED: 'review_state input must be an object',
  ACTION_INVALID: 'action must be prepare, checkpoint, scope, seal, or cleanup',
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
