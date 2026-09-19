import { BUILTIN_RULE_IDS } from './builtinRuleIds.js';

/** Schema version for persisted review state records. */
export const REVIEW_STATE_SCHEMA_VERSION = 2 as const;

/** Validation contract required before persisted opinions may be reused. */
export const REVIEW_VALIDATION_POLICY_VERSION = 2 as const;
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
  STATUS_PORCELAIN: ['status', '--porcelain', '-z', '--untracked-files=all'],
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
  HANDOFF: 'handoff',
} as const;

/** Review rounds assigned to each supported effort level. */
export const REVIEW_EFFORT_ROUNDS = {
  low: 1,
  medium: 2,
  high: 3,
} as const;

/** Effort used when neither the request nor configuration chooses one. */
export const REVIEW_DEFAULT_EFFORT = 'auto';

/** Reviewable group count at which automatic effort selects a single round. */
export const REVIEW_AUTO_LOW_EFFORT_GROUP_THRESHOLD = 16;

/** Default prepare-time ceiling on groups requiring reviewer actors. */
export const REVIEW_MAX_GROUPS = 64;

/** Minimum file cap used by automatic review-group sizing. */
export const REVIEW_GROUP_FILE_LIMIT = 10;

/** Maximum file cap for automatic sizing of low-churn changes. */
export const REVIEW_GROUP_ADAPTIVE_FILE_LIMIT = 32;

/** Maximum total churn in one group and one chunk by default. */
export const REVIEW_GROUP_CHURN_LIMIT = 1024;

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

/** Maximum characters of a sanitized change-context excerpt rendered in artifacts. */
export const REVIEW_CHANGE_CONTEXT_LIMIT = 3000;

/** Maximum bytes accepted from one change-context input file. */
export const REVIEW_CHANGE_CONTEXT_FILE_LIMIT = 1_048_576;

/** Ordered PR body headings retained in the change-context excerpt. */
export const REVIEW_CHANGE_CONTEXT_SECTIONS = [
  '## Summary',
  '## Contract',
  '## Review notes',
] as const;

/** Maximum non-merge commit subjects included in generated change context. */
export const REVIEW_CHANGE_CONTEXT_LOG_LIMIT = 30;

/** HTML comment marker identifying the untrusted Stage 1 handoff payload. */
export const REVIEW_HANDOFF_MARKER = 'filid:handoff v1';

/** Schema version accepted for Stage 1 handoff payloads. */
export const REVIEW_HANDOFF_SCHEMA_VERSION = 1;

/** Maximum recorded claims accepted in one handoff payload. */
export const REVIEW_HANDOFF_MAX_ENTRIES = 40;

/** Maximum characters accepted in one handoff path. */
export const REVIEW_HANDOFF_PATH_LIMIT = 400;

/** Maximum characters accepted in one handoff rule identifier. */
export const REVIEW_HANDOFF_RULE_ID_LIMIT = 80;

/** Maximum characters accepted in one handoff snapshot hash. */
export const REVIEW_HANDOFF_HASH_LIMIT = 128;

/** Maximum owner paths accepted in one handoff scope. */
export const REVIEW_HANDOFF_SCOPE_LIMIT = 200;

/** Maximum characters retained in one handoff claim's note. */
export const REVIEW_HANDOFF_NOTE_LIMIT = 120;

/** Claim classes emitted by the Stage 1 handoff writer. */
export const REVIEW_HANDOFF_CLASSES = [
  'code-change',
  'config-decision',
  'indeterminate',
  'needs-rework',
  'unresolved-path',
  'document-sync',
] as const;

/** Claim classes emitted by the handoff writer and accepted by its reader. */
export type ReviewHandoffClass = (typeof REVIEW_HANDOFF_CLASSES)[number];

/** Stable table and seed ordering, identical to the declared class order. */
export const REVIEW_HANDOFF_CLASS_ORDER = REVIEW_HANDOFF_CLASSES;

/** Built-in finding rules whose handoff treatment is independent of scope. */
export const REVIEW_HANDOFF_RULE_CLASSES: Readonly<
  Record<string, ReviewHandoffClass>
> = {
  [BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY]: 'code-change',
  [BUILTIN_RULE_IDS.EXTERNAL_IMPORT_BOUNDARY]: 'code-change',
  [BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION]: 'code-change',
  [BUILTIN_RULE_IDS.MAX_DEPTH]: 'code-change',
  [BUILTIN_RULE_IDS.ZERO_PEER_FILE]: 'code-change',
  [BUILTIN_RULE_IDS.MODULE_ENTRY_POINT]: 'code-change',
  [BUILTIN_RULE_IDS.ENTRY_POINT_SURFACE]: 'code-change',
  [BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD]: 'config-decision',
};

/** Maximum visible rows in the human-readable handoff table. */
export const REVIEW_HANDOFF_TABLE_ROW_LIMIT = 20;

/** Same-class and same-rule row count above which the table collapses a group. */
export const REVIEW_HANDOFF_COLLAPSE_THRESHOLD = 5;

/** Rule identifiers reserved for caller and validation synchronization claims. */
export const REVIEW_HANDOFF_SYNTHETIC_RULE_IDS = {
  DOCUMENT_SYNC: 'document-sync',
  HANDOFF_VALIDATE: 'handoff-validate',
} as const;

/** Document synchronization outcomes accepted from the handoff writer. */
export const REVIEW_HANDOFF_DOCUMENT_SYNC_STATES = [
  'committed',
  'no-change',
  'skipped',
  'declined',
  'failed',
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
  HANDOFF: 'handoff.md',
  REPORT: 'review-report.md',
  BLOCKERS: 'review-blockers.md',
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
  REVIEW_STATE_FILE_NAMES.BLOCKERS,
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
  /** A prepared assignment cannot change its effective review effort. */
  EFFORT_LOCKED: 'review-effort-locked',
  /** Persisted validation belongs to an unsupported trust policy. */
  VALIDATION_POLICY_OUTDATED: 'review-validation-policy-outdated',
  /** Configured actor-group budget would be exceeded by this review. */
  GROUP_BUDGET_EXCEEDED: 'review-group-budget-exceeded',
  BRANCH_UNRESOLVED: 'review-branch-unresolved',
  BASE_REF_UNRESOLVED: 'review-base-ref-unresolved',
  CHANGE_CONTEXT_TRUNCATED: 'review-change-context-truncated',
  /** Caller context did not contain any configured PR template section. */
  CHANGE_CONTEXT_UNTEMPLATED: 'review-change-context-untemplated',
  /** Invalid JSON or schema in the first handoff block. */
  HANDOFF_INVALID: 'review-handoff-invalid',
  ACTOR_METHOD_MISSING: 'review-actor-method-missing',
  STATE_MISSING: 'review-state-missing',
  SOURCE_HASH_STALE: 'review-source-hash-stale',
  WORKTREE_STALE: 'review-worktree-stale',
  REPORT_MISSING: 'review-report-missing',
  /** A marked sealed review has lost its canonical blocker report. */
  BLOCKERS_MISSING: 'review-blockers-missing',
  /** A marked blocker report does not match its sealed review identity. */
  BLOCKERS_INVALID: 'review-blockers-invalid',
  STATE_SCHEMA_MISMATCH: 'review-state-schema-mismatch',
  RULE_PATH_ESCAPE: 'review-rule-path-escape',
  OPINIONS_MISSING: 'review-opinions-missing',
  OPINION_INVALID: 'review-opinion-invalid',
  SESSION_MISSING: 'review-session-missing',
  RULE_MAP_MISSING: 'review-rule-map-missing',
  /** Legacy or unreadable-schema state without explicit force. */
  INCREMENTAL_BOOTSTRAP_REQUIRED: 'review-incremental-bootstrap-required',
  /** Local review inputs (instructions, rules, actor methods) changed since prepare. */
  INPUTS_STALE: 'review-inputs-stale',
  /** Repository `.filid/review-rules.json` content or schema is invalid. */
  REPOSITORY_RULES_INVALID: 'review-repository-rules-invalid',
  /** A repository rule declares a body file that does not exist. */
  REPOSITORY_RULE_BODY_MISSING: 'review-repository-rule-body-missing',
  /** Installed built-in cross-review rule map is malformed. */
  RULE_MAP_INVALID: 'review-rule-map-invalid',
  /** A `review.*` config value fails schema validation. */
  CONFIG_INVALID: 'review-config-invalid',
  /** Persisted state JSON parses but fails the record schema. */
  STATE_INVALID: 'review-state-invalid',
  /** `changeContextPath` does not identify a readable regular file. */
  CHANGE_CONTEXT_PATH_INVALID: 'review-change-context-path-invalid',
  /** `changeContextPath` file exceeds the change-context byte limit. */
  CHANGE_CONTEXT_TOO_LARGE: 'review-change-context-too-large',
  /** `branchName` is empty, absolute, or contains a traversal segment. */
  BRANCH_NAME_INVALID: 'review-branch-name-invalid',
  /** `cleanup` was called without `confirm: true`. */
  CLEANUP_CONFIRM_REQUIRED: 'review-cleanup-confirm-required',
} as const;

/** Human-readable counterparts for review-state diagnostic codes. */
export const REVIEW_STATE_DIAGNOSTIC_MESSAGES = {
  STATE_MISSING: 'No prepared review state exists for this branch.',
  SOURCE_HASH_STALE:
    'Committed source content no longer matches the prepared review state.',
  WORKTREE_STALE:
    'Uncommitted worktree paths changed after this review was sealed, so the sealed verdict no longer describes the worktree.',
  REPORT_MISSING: 'The canonical review report is missing.',
  BLOCKERS_MISSING: 'The canonical review blocker report is missing.',
  BLOCKERS_INVALID:
    'The canonical review blocker report does not match its sealed review.',
  STATE_SCHEMA_MISMATCH: 'The review state uses an unsupported schema version.',
  RULE_PATH_ESCAPE: 'A repository review rule escapes the project root.',
  OPINIONS_MISSING: 'No merged review opinions exist for this review state.',
  OPINION_INVALID: 'The review opinion is missing or invalid.',
  SESSION_MISSING: 'The prepared review session artifact is missing.',
  RULE_MAP_MISSING: 'The cross-review rule map is missing.',
} as const;

/**
 * Next action attached where the calling action does not change the wording
 * (`REVIEW_STATE_DIAGNOSTIC_CODES` key -> nextAction). Codes whose wording
 * depends on the calling action or on values only the producer knows
 * (`STATE_MISSING`, `STATE_SCHEMA_MISMATCH`, `SOURCE_HASH_STALE`,
 * `REPORT_MISSING`, `OPINION_INVALID`, `INPUTS_STALE`, `WORKTREE_STALE`,
 * `SESSION_MISSING`, `OPINIONS_MISSING`, `EFFORT_LOCKED`,
 * `REPOSITORY_RULE_BODY_MISSING`) are built at their producer site instead and
 * are not listed here. `PLUGIN_ROOT_UNAVAILABLE` is not a code:
 * the rule-map and actor-method codes share it when no plugin root resolves.
 */
export const REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS = {
  VALIDATION_POLICY_OUTDATED:
    "Stop without dispatching actors or publishing a verdict, and ask the user whether to start a fresh review. Only on the user's explicit request, and after all prior actors finish, call prepare with force: true (/filid:cross-review --force); this repeats all review work.",
  RULE_PATH_ESCAPE:
    'Ask the user to make .filid/review-rules.json and its rule files regular files inside the repository. Then call review_state prepare again.',
  ACTOR_METHOD_MISSING:
    'Stop without dispatching actors or publishing a verdict. Ask the user to reinstall or update the filid plugin, whose installed cross-review actor files are incomplete, then retry the same call.',
  RULE_MAP_MISSING:
    'Stop without dispatching actors or publishing a verdict. Ask the user to reinstall or update the filid plugin, whose installed cross-review rule files are incomplete, then retry the same call.',
  PLUGIN_ROOT_UNAVAILABLE:
    'Stop without dispatching actors or publishing a verdict. Ask the user to reinstall or re-enable the filid plugin and restart the session so its MCP server receives the plugin root, then retry the same call.',
  BRANCH_UNRESOLVED:
    'Check out the branch under review, or call review_state again with branchName set to that branch. Ask the user which branch this review belongs to if it is unknown.',
  INCREMENTAL_BOOTSTRAP_REQUIRED:
    "Stop without dispatching actors or publishing a verdict, and ask the user whether to start a fresh review. Only on the user's explicit request, and after all prior actors finish, call prepare with force: true; the prior run is preserved and every file is reviewed again.",
  BLOCKERS_MISSING:
    "Stop without publishing or relying on the sealed verdict, and ask the user whether to start a fresh review. Only on the user's explicit request, and after all prior actors finish, call prepare with force: true (/filid:cross-review --force); never rewrite the seal.",
  BLOCKERS_INVALID:
    "Stop without publishing or relying on the sealed verdict, and ask the user whether to start a fresh review. Only on the user's explicit request, and after all prior actors finish, call prepare with force: true (/filid:cross-review --force); never rewrite the seal.",
  GROUP_BUDGET_EXCEEDED:
    'Stop without dispatching actors and ask the user to split the PR or raise review.maxGroups or the grouping limits in the filid config. After the user changes grouping limits, call prepare with force: true only if the user requests it; force never bypasses review.maxGroups.',
  BASE_REF_UNRESOLVED:
    'Run git fetch origin to refresh origin refs, then retry the same review_state call. If no base resolves, ask the user for an explicit base ref; never substitute the repository default.',
  HANDOFF_INVALID:
    'Continue the review; reviewers see the invalid block as an indeterminate FCA handoff finding. Report this to the user and suggest regenerating the handoff block with /filid:pull-request; a corrected PR body reaches briefs only through a later --force run.',
  CHANGE_CONTEXT_UNTEMPLATED:
    'Continue the review; no action is required. If the PR body should follow the filid template, suggest /filid:pull-request to the user; the new body reaches briefs only through a later --force run.',
  CHANGE_CONTEXT_TRUNCATED:
    "Continue the review; no action is required. To give reviewers the full context, ask the user to shorten the PR body's Summary, Contract, and Review notes sections, which reaches briefs only through a later --force run.",
  REPOSITORY_RULES_INVALID:
    'Ask the user to fix .filid/review-rules.json as the message describes. Then call review_state prepare again; while it is invalid, prepare, checkpoint, validate, and seal all fail.',
  RULE_MAP_INVALID:
    'Stop without dispatching actors or publishing a verdict. Ask the user to reinstall or update the filid plugin, whose installed cross-review rules.json is malformed, then retry the same call.',
  CONFIG_INVALID:
    'Ask the user to correct the named review setting in the filid config, then retry the same review_state call.',
  STATE_INVALID:
    "Stop without a verdict and ask the user whether to delete this branch's review directory with /filid:cross-review --cleanup, which discards its artifacts; then prepare again.",
  CHANGE_CONTEXT_PATH_INVALID:
    'Pass an absolute path to a readable regular file for changeContextPath, then call again.',
  CHANGE_CONTEXT_TOO_LARGE:
    'Shorten the file at changeContextPath below the change context file limit, or pass changeContext inline instead, then call again.',
  BRANCH_NAME_INVALID:
    'Pass a non-empty branchName with no path separator, traversal segment, or control character, then call again.',
  CLEANUP_CONFIRM_REQUIRED:
    "Pass confirm: true to cleanup only after the user explicitly agrees to discard this branch's review artifacts, then call again.",
} as const;

/** Sentence prefixed to a shared snapshot diagnostic's nextAction during a review. */
export const REVIEW_CONTEXT_NEXT_ACTIONS = {
  DOCUMENT_FINDING:
    'Continue the review; this is an FCA document finding the review evaluates as a candidate, not missing evidence.',
  EVIDENCE:
    'Continue the review; seal carries this diagnostic into the review blockers with its own next action. Do not report the review as complete while it remains.',
  CONFIG_WARNING:
    'Continue the review; dropping this key changes no analysis conclusion. Ask the user to fix or remove the named key in the filid config; the review used the remaining valid settings.',
  CONFIG_WARNING_BLOCKING:
    'Continue the review; the dropped entry may have tightened the analysis, so seal carries this diagnostic into the review blockers with its own next action. Do not report the review as complete while it remains; ask the user to fix or remove the named key in the filid config.',
  CONFIG_MIGRATION_REQUIRED:
    'Continue the review. Ask the user to save the config through the filid settings flow to persist config v2.',
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
  /** Reject a path that cannot identify a readable regular file directly. */
  CHANGE_CONTEXT_PATH_INVALID:
    'changeContextPath must be an absolute path to a readable regular file',
  /** Reject ambiguous simultaneous inline and file context inputs. */
  CHANGE_CONTEXT_CONFLICT:
    'changeContext and changeContextPath are mutually exclusive',
  /** Reject a context file whose byte size exceeds the reader boundary. */
  CHANGE_CONTEXT_FILE_TOO_LARGE:
    'changeContextPath file exceeds the change context file limit',
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
