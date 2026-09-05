/** Schema version for persisted review state records. */
export const REVIEW_STATE_SCHEMA_VERSION = 2 as const;
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

/** Supported operations on the single `review_state` tool. */
export const REVIEW_STATE_ACTIONS = {
  PREPARE: 'prepare',
  CHECKPOINT: 'checkpoint',
  VALIDATE: 'validate',
  SEAL: 'seal',
  CLEANUP: 'cleanup',
  ASSESS: 'assess',
} as const;

/** Review rounds assigned to each supported effort level. */
export const REVIEW_EFFORT_ROUNDS = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

/** Effort used when neither the request nor configuration chooses one. */
export const REVIEW_DEFAULT_EFFORT = 'medium';

/** Maximum review units grouped together by default. */
export const REVIEW_GROUP_FILE_LIMIT = 10;

/** Maximum total churn in one group and one chunk by default. */
export const REVIEW_GROUP_CHURN_LIMIT = 800;

/** File-count threshold for the single-group shortcut. */
export const REVIEW_SMALL_GROUP_FILE_LIMIT = 4;

/** Churn threshold for the single-group shortcut. */
export const REVIEW_SMALL_GROUP_CHURN_LIMIT = 200;

/** File churn above which a group requires an explicit risk plan. */
export const REVIEW_PLAN_CHURN_LIMIT = 50;

/** Maximum reviewer groups the orchestrator runs concurrently by default. */
export const REVIEW_CONCURRENCY = 8;

/** Canonical lockfile basenames skipped by review unless configured otherwise. */
export const REVIEW_LOCKFILE_BASENAMES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
  'Cargo.lock',
  'poetry.lock',
  'Pipfile.lock',
  'composer.lock',
  'Gemfile.lock',
  'go.sum',
  'gradle.lockfile',
  'flake.lock',
  'mix.lock',
] as const;

/** Schema version required for reviewer and verifier JSON artifacts. */
export const REVIEW_OPINION_SCHEMA_VERSION = 7 as const;

/** Validation targets accepted by the review-state validate action. */
export const REVIEW_VALIDATE_KINDS = {
  REVIEW: 'review',
  VERIFY: 'verify',
} as const;

/** Deterministic reasons that make a changed path non-reviewable. */
export const REVIEW_SKIP_REASONS = {
  GENERATED: 'generated artifact',
  DELETED: 'deleted path',
  BINARY: 'binary content',
  LOCKFILE: 'lockfile',
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
  'main',
  'master',
] as const;

/** Maximum combined UTF-8 diff bytes embedded in one actor brief. */
export const REVIEW_BRIEF_INLINE_DIFF_LIMIT = 16384;

/** Maximum characters of sanitized change context rendered in artifacts. */
export const REVIEW_CHANGE_CONTEXT_LIMIT = 8000;

/** Maximum non-merge commit subjects included in generated change context. */
export const REVIEW_CHANGE_CONTEXT_LOG_LIMIT = 30;

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

/** Lifecycle outcomes returned by review-state handlers. */
export const REVIEW_STATE_DISPOSITIONS = {
  FRESH: 'fresh',
  RESUMABLE: 'resumable',
  CACHED: 'cached',
  STALE: 'stale',
  MISSING: 'missing',
  VALIDATED: 'validated',
  SEALED: 'sealed',
  CLEANED: 'cleaned',
} as const;

/** Artifact subdirectories inside one branch review directory. */
export const REVIEW_STATE_DIRECTORY_NAMES = {
  FILID: '.filid',
  REVIEW: 'review',
  OPINIONS: 'opinions',
  DIFFS: 'diffs',
  BRIEFS: 'briefs',
} as const;

/** Canonical filenames used by review-state artifacts and rule discovery. */
export const REVIEW_STATE_FILE_NAMES = {
  STATE: 'review-state.json',
  REPORT: 'review-report.md',
  PR_COMMENT: 'pr-comment.md',
  EVIDENCE: 'evidence.md',
  SESSION: 'session.md',
  VERIFICATION: 'verification.md',
  VERIFICATION_METRICS_PARTIAL: 'verification.metrics-half.partial.md',
  VERIFICATION_STRUCTURE_PARTIAL: 'verification.structure-half.partial.md',
  STRUCTURE_CHECK: 'structure-check.md',
  FIX_REQUESTS: 'fix-requests.md',
  JUSTIFICATIONS: 'justifications.md',
  RE_VALIDATE: 're-validate.md',
  RULE_MAP: 'rules.json',
  REVIEWER_METHOD: 'reviewers/reviewer.md',
  VERIFIER_METHOD: 'reviewers/verifier.md',
  REPOSITORY_RULES: '.filid/review-rules.json',
} as const;

/** Files removed before a fresh review state is prepared. */
export const REVIEW_STATE_STALE_ARTIFACT_FILE_NAMES = [
  REVIEW_STATE_FILE_NAMES.REPORT,
  REVIEW_STATE_FILE_NAMES.PR_COMMENT,
  REVIEW_STATE_FILE_NAMES.SESSION,
  REVIEW_STATE_FILE_NAMES.EVIDENCE,
  REVIEW_STATE_FILE_NAMES.VERIFICATION,
  REVIEW_STATE_FILE_NAMES.VERIFICATION_METRICS_PARTIAL,
  REVIEW_STATE_FILE_NAMES.VERIFICATION_STRUCTURE_PARTIAL,
  REVIEW_STATE_FILE_NAMES.STRUCTURE_CHECK,
  REVIEW_STATE_FILE_NAMES.FIX_REQUESTS,
] as const;

/** Directories removed before a fresh review state is prepared. */
export const REVIEW_STATE_STALE_ARTIFACT_DIRECTORY_NAMES = [
  REVIEW_STATE_DIRECTORY_NAMES.OPINIONS,
  REVIEW_STATE_DIRECTORY_NAMES.DIFFS,
  REVIEW_STATE_DIRECTORY_NAMES.BRIEFS,
] as const;

/** Stable machine-readable diagnostic codes returned by review-state handlers. */
export const REVIEW_STATE_DIAGNOSTIC_CODES = {
  BRANCH_UNRESOLVED: 'review-branch-unresolved',
  BASE_REF_UNRESOLVED: 'review-base-ref-unresolved',
  CHANGE_CONTEXT_TRUNCATED: 'review-change-context-truncated',
  ACTOR_METHOD_MISSING: 'review-actor-method-missing',
  STATE_MISSING: 'review-state-missing',
  SOURCE_HASH_STALE: 'review-source-hash-stale',
  STATE_SEALED: 'review-state-sealed',
  REPORT_MISSING: 'review-report-missing',
  STATE_SCHEMA_MISMATCH: 'review-state-schema-mismatch',
  RULE_PATH_ESCAPE: 'review-rule-path-escape',
  OPINIONS_MISSING: 'review-opinions-missing',
  OPINION_INVALID: 'review-opinion-invalid',
  SESSION_MISSING: 'review-session-missing',
  RULE_MAP_MISSING: 'review-rule-map-missing',
} as const;

/** Human-readable counterparts for review-state diagnostic codes. */
export const REVIEW_STATE_DIAGNOSTIC_MESSAGES = {
  STATE_MISSING: 'No prepared review state exists for this branch.',
  SOURCE_HASH_STALE:
    'Committed source content no longer matches the prepared review state.',
  STATE_SEALED: 'A sealed review state cannot be scoped again.',
  REPORT_MISSING: 'The canonical review report is missing.',
  STATE_SCHEMA_MISMATCH: 'The review state uses an unsupported schema version.',
  RULE_PATH_ESCAPE: 'A repository review rule escapes the project root.',
  OPINIONS_MISSING: 'No merged review opinions exist for this review state.',
  OPINION_INVALID: 'The review opinion is missing or invalid.',
  SESSION_MISSING: 'The prepared review session artifact is missing.',
  RULE_MAP_MISSING: 'The cross-review rule map is missing.',
} as const;

/** Schema version rendered in canonical cross-review evidence. */
export const REVIEW_EVIDENCE_SCHEMA_VERSION = 7 as const;

/** Maximum dirty paths returned inline by the scope action. */
export const REVIEW_SCOPE_DIRTY_PATH_LIMIT = 20;

/** Exact unresolved-evidence marker for incomplete or conflicting decision sets. */
export const REVIEW_DECISION_COVERAGE_MISMATCH = 'decision coverage mismatch';

/** Stable input and internal error messages for the review-state boundary. */
export const REVIEW_STATE_ERROR_MESSAGES = {
  /** Reject non-string caller context before preparing artifacts. */
  CHANGE_CONTEXT_INVALID: 'changeContext must be a string',
  /** Brief rendering requires the canonical reviewer and verifier methods. */
  ACTOR_METHODS_REQUIRED:
    'Actor methods are required to render a review brief.',
  INPUT_OBJECT_REQUIRED: 'review_state input must be an object',
  ACTION_INVALID:
    'action must be prepare, checkpoint, validate, seal, cleanup, or assess',
  PROJECT_ROOT_REQUIRED: 'projectRoot is required',
  BRANCH_NAME_REQUIRED: 'branchName is required',
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
