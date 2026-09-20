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

/** Review key for a detached HEAD without branchName: the prefix and the length of the HEAD commit id it keeps. */
export const REVIEW_DETACHED_BRANCH_KEY = {
  PREFIX: 'detached-',
  COMMIT_ID_LENGTH: 12,
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
  GENERATIONS: 'generations',
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
  FACTS: 'facts.json',
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

/** Name prefix of the archived states prepare leaves beside a replaced state file. */
export const REVIEW_STATE_REPLACED_FILE_PREFIX = 'replaced-state-';

/**
 * What every action says when the stored review state cannot be used: one
 * prepare without force replaces it, and a repeat inside one run ends the run.
 */
/** How every "call prepare once" sentence ends: a repeat inside one run ends the run. */
export const PREPARE_ONCE_REPEAT_TAIL =
  'If the same diagnostic returns in this run, end without a terminal verdict and record it in the report as a filid defect.';

export const PREPARE_ONCE_NEXT_ACTION = `Do not publish a verdict. After every in-flight actor finishes, call prepare once with the same arguments and without force: it archives this state and starts a new review generation. ${PREPARE_ONCE_REPEAT_TAIL}`;

/** Stable machine-readable diagnostic codes returned by review-state handlers. */
export const REVIEW_STATE_DIAGNOSTIC_CODES = {
  /** A prepared assignment cannot change its effective review effort. */
  EFFORT_LOCKED: 'review-effort-locked',
  /** Persisted validation belongs to an unsupported trust policy. */
  VALIDATION_POLICY_OUTDATED: 'review-validation-policy-outdated',
  /** Configured actor-group budget would be exceeded by this review. */
  GROUP_BUDGET_EXCEEDED: 'review-group-budget-exceeded',
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
  /** A generation's frozen facts are gone or no longer match their digest. */
  FACTS_FROZEN_UNUSABLE: 'review-facts-frozen-unusable',
  RULE_MAP_MISSING: 'review-rule-map-missing',
  /** Legacy or unreadable-schema state without explicit force. */
  INCREMENTAL_BOOTSTRAP_REQUIRED: 'review-incremental-bootstrap-required',
  /** Local review inputs (instructions, rules, actor methods) changed since prepare. */
  INPUTS_STALE: 'review-inputs-stale',
  /** A file in the review scope has no facts the evidence can be drawn from. */
  FACTS_INCOMPLETE: 'facts-incomplete',
  /** Review-scope files the declared facts scope leaves unread. */
  FILES_OUTSIDE_FACTS_SCOPE: 'review-files-outside-facts-scope',
  /** The store disputes a reference this generation was judged on. */
  FACTS_DISCREPANCY: 'facts-discrepancy',
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
  /** Prepare archived an unusable state and started a new generation. */
  STATE_REPLACED: 'review-state-replaced',
  /** An unusable state could not be moved aside, so prepare wrote nothing. */
  STATE_ARCHIVE_FAILED: 'review-state-archive-failed',
  /** The opinion belongs to a generation a later prepare replaced. */
  GENERATION_SUPERSEDED: 'review-generation-superseded',
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
  FACTS_FROZEN_UNUSABLE:
    'The facts this generation recorded a digest for are not the facts on disk.',
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
  STATE_ARCHIVE_FAILED:
    'Nothing was written. Ask the user to make the named review directory writable, or to move it aside, then call prepare again; filid cannot change file permissions.',
  GENERATION_SUPERSEDED:
    'Do not merge this opinion: discard it, because a later prepare replaced the generation it was written for. Continue from the handoffs the latest prepare or checkpoint returned, and record the discarded assignment in the report.',
  WORKTREE_STALE:
    'Report that the worktree changed after this verdict was sealed: the verdict answers for the committed source it names, and the uncommitted changes are outside it. Commit them and run /filid:cross-review again to have them reviewed.',
  EFFORT_LOCKED:
    'Report that the prepared review keeps its effort and that the configured effort applies to the next review; to review at another effort now, call prepare with that effort argument.',
  VALIDATION_POLICY_OUTDATED: PREPARE_ONCE_NEXT_ACTION,
  FACTS_DISCREPANCY_UNSETTLED:
    'Do not publish a verdict: a reviewed file holds a reported reference this generation was not judged on, and its side-table item is still open. Read the line this diagnostic names and call facts adjudicate for that item — adopt it when the reference is real, or dismiss it with a reason, which a second actor, a separate subagent the skill stands up, then judges independently. If the stored record is the wrong one, submit that file again with the tool that reads it correctly. Then call seal again. Whether that seal publishes depends on where the settlement leaves the file\'s valid references, not on which way it was decided: a settlement that leaves them as this generation froze them seals, and one that adds or removes an edge answers with this same code and a next action asking for one prepare, which reviews only the files whose references changed. Follow whichever of the two comes back.',
  FACTS_DISCREPANCY_FROZEN_EDGES_CHANGED:
    'Do not publish a verdict: a reviewed file\'s valid references are no longer the ones this generation froze — an edge has been added to them, or one it was judged on is gone. Either way the review answered for a set of edges that is not the current one. Call prepare once with the same arguments and without force — only the files whose valid references changed are reviewed again — then finish those and seal.',
  STATE_MISSING: `Do not publish a verdict. After every in-flight actor finishes, call prepare once with the same arguments and without force: it prepares and reviews this branch from the start. ${PREPARE_ONCE_REPEAT_TAIL}`,
  SOURCE_HASH_STALE: `Do not publish a verdict. After every in-flight actor finishes, call prepare once with the same arguments and without force: it prepares the current commits and reuses validated opinions for unchanged files. ${PREPARE_ONCE_REPEAT_TAIL}`,
  REPORT_MISSING: `Do not publish a verdict. After every in-flight actor finishes, call prepare once with the same arguments and without force: it opens a generation from the validated opinions, so seal restores the report without new reviewer work. ${PREPARE_ONCE_REPEAT_TAIL}`,
  SESSION_MISSING: `Do not publish a verdict. After every in-flight actor finishes, call prepare once with the same arguments and without force: it restores the session artifact and keeps validated progress. ${PREPARE_ONCE_REPEAT_TAIL}`,
  OPINIONS_MISSING: `Do not publish a verdict: no reviewable group has a merged opinion. After every in-flight actor finishes, call prepare once with the same arguments and without force and dispatch the handoffs it returns. ${PREPARE_ONCE_REPEAT_TAIL}`,
  FACTS_FROZEN_UNUSABLE: `Do not publish a verdict. Call prepare once with the same arguments and without force: a generation whose frozen facts do not match its digest is incomplete, so prepare freezes them again and keeps validated progress. ${PREPARE_ONCE_REPEAT_TAIL}`,
  FILES_OUTSIDE_FACTS_SCOPE:
    'Nothing is blocked: the review judged these files by every rule but the reference-based ones, which read facts. To have their references judged too, add their paths to facts.covers in the project .filid/config.json — an edit that belongs outside a review, because it changes the worktree a review is judging — then run the facts bootstrap (skills/.shared/facts-bootstrap.md) and call prepare again. Leaving the scope as it is remains a valid choice; this line only records what the current scope left unread.',
  FACTS_INCOMPLETE:
    'Do not review this branch yet: filid holds no settled facts for the files this message names, so the review would be judged on references nobody has confirmed. Run the facts bootstrap (skills/.shared/facts-bootstrap.md) and route each file by where facts status puts it, not by its state alone — re-extracting answers missing and needsResolution, and nothing else. A file in missing or needsResolution is extracted with the program named in the output requirement and submitted. A file in rejected follows that item\'s own nextAction. A file in unadjudicated is settled with facts adjudicate — a dismissal is confirmed by a second actor, which the skill stands up as a separate subagent. A file in pendingAttestations or indeterminate needs an attested record that a second actor confirms. A file in awaitingComparison lost its judgements to a discard: extract it with a program whose provenance.tool differs from that entry\'s storedTool, or read and submit it attested, then give that candidate to facts compare with no generationId. A file held by a facts-judgements-unreadable diagnostic is in no list at all, because what did not read is what would have named it — that diagnostic names the shard, and facts discard-damaged with that name moves it. Those lists and that diagnostic account for every file reported uncertain. Then call prepare again with the same arguments and without force.',
  RULE_PATH_ESCAPE:
    'Ask the user to make .filid/review-rules.json and its rule files regular files inside the repository. Then call review_state prepare again.',
  ACTOR_METHOD_MISSING:
    'Stop without dispatching actors or publishing a verdict. Ask the user to reinstall or update the filid plugin, whose installed cross-review actor files are incomplete, then retry the same call.',
  RULE_MAP_MISSING:
    'Stop without dispatching actors or publishing a verdict. Ask the user to reinstall or update the filid plugin, whose installed cross-review rule files are incomplete, then retry the same call.',
  PLUGIN_ROOT_UNAVAILABLE:
    'Stop without dispatching actors or publishing a verdict. Ask the user to reinstall or re-enable the filid plugin and restart the session so its MCP server receives the plugin root, then retry the same call.',
  INCREMENTAL_BOOTSTRAP_REQUIRED: PREPARE_ONCE_NEXT_ACTION,
  STATE_REPLACED:
    'Report that the unusable review state was archived beside the named path and that no prior opinion was reused, then continue with this prepared generation.',
  BLOCKERS_MISSING: PREPARE_ONCE_NEXT_ACTION,
  BLOCKERS_INVALID: PREPARE_ONCE_NEXT_ACTION,
  GROUP_BUDGET_EXCEEDED:
    "Stop without dispatching actors and ask the user to split the PR or raise review.maxGroups in .filid/config.json; unset, the limit is filid's own default of 64 rather than a number the user chose. After the user changes grouping limits, call prepare with force: true only if the user requests it; force never bypasses review.maxGroups.",
  BASE_REF_UNRESOLVED:
    'Run git fetch origin to refresh origin refs, then retry the same review_state call. If no base resolves, ask the user for an explicit base ref; never substitute the repository default.',
  HANDOFF_INVALID:
    "Continue the review; reviewers see the invalid block as an indeterminate FCA handoff finding. Report that the PR body's handoff block is invalid and that /filid:pull-request regenerates it; a corrected PR body reaches briefs only through a later --force run.",
  CHANGE_CONTEXT_UNTEMPLATED:
    'Continue the review; no action is required. If the PR body should follow the filid template, suggest /filid:pull-request to the user; the new body reaches briefs only through a later --force run.',
  CHANGE_CONTEXT_TRUNCATED:
    "Continue the review; no action is required. Report that the PR body's Summary, Contract, and Review notes sections were truncated for the reviewers; a shorter body reaches briefs only through a later --force run.",
  REPOSITORY_RULES_INVALID:
    'Ask the user to fix .filid/review-rules.json as the message describes. Then call review_state prepare again; while it is invalid, prepare, checkpoint, validate, and seal all fail.',
  RULE_MAP_INVALID:
    'Stop without dispatching actors or publishing a verdict. Ask the user to reinstall or update the filid plugin, whose installed cross-review rules.json is malformed, then retry the same call.',
  CONFIG_INVALID:
    'Ask the user to correct the named review setting in the filid config, then retry the same review_state call.',
  STATE_INVALID: PREPARE_ONCE_NEXT_ACTION,
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
    'Continue the review; dropping this key changes no analysis conclusion. Report that the named key in the filid config is invalid and was dropped, so it should be fixed or removed; the review used the remaining valid settings.',
  CONFIG_WARNING_BLOCKING:
    'Continue the review; the dropped entry may have tightened the analysis, so seal carries this diagnostic into the review blockers with its own next action. Do not report the review as complete while it remains; ask the user to fix or remove the named key in the filid config.',
  CONFIG_MIGRATION_REQUIRED:
    'Continue the review. Report that the filid config is still v1; project_setup init outside this review writes the converted v2 configuration.',
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
