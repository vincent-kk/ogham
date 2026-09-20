import { REVIEW_LOCKFILE_BASENAMES } from './reviewState.js';

/** Schema version stamped on every submitted and stored facts record. */
export const FACTS_SCHEMA_VERSION = 1;

/** Algorithm prefix every `contentHash` and `resolutionEpoch` carries. */
export const FACTS_HASH_PREFIX = 'sha256:';

/** Directory under the project cache directory that holds facts records. */
export const FACTS_STORE_DIRECTORY = 'facts';

/** File extension of one stored shard file. */
export const FACTS_RECORD_EXTENSION = '.json';

/**
 * Hex digits of a path digest that name its shard, giving 256 shard files.
 *
 * Chosen so a store of a few thousand records costs a couple of hundred file
 * opens instead of one per record, while keeping each shard small enough that
 * rewriting one is cheap.
 */
export const FACTS_SHARD_NAME_LENGTH = 2;

/** Directory under the facts store that holds the adjudication side table. */
export const FACTS_SIDE_TABLE_DIRECTORY = 'adjudications';

/** File holding the paths an extractor should read, one per line. */
export const FACTS_EXTRACTION_LIST_FILE = 'extract.txt';

/** File holding the consecutive-epoch counter behind `facts-tree-unstable`. */
export const FACTS_EPOCH_DRIFT_FILE = 'epoch-drift.json';

/**
 * Consecutive distinct new epochs a caller may be told about before filid
 * stops asking it to re-extract (spec §2.4 termination condition).
 */
export const FACTS_EPOCH_DRIFT_LIMIT = 3;

/**
 * Glob patterns matched against a file's BASENAME to find resolution inputs.
 *
 * Basenames rather than paths: a manifest governs resolution for the directory
 * it sits in, wherever that is, and a workspace has one per package.
 *
 * The conventions pack (spec §7) owns this list; until it exists this constant
 * is its single default, so a language whose resolver reads other files
 * declares them through `provenance.resolutionInputs` instead. Ecosystem
 * literals normally stay inside `adapters/` — they sit here because the pack
 * that will hold them is a later stage, and `REVIEW_LOCKFILE_BASENAMES` is the
 * existing precedent for a manifest list in `constants/`.
 */
export const FACTS_RESOLUTION_CONFIG_PATTERNS: readonly string[] = [
  'package.json',
  'tsconfig*.json',
  'jsconfig.json',
  ...REVIEW_LOCKFILE_BASENAMES,
];

/**
 * Largest submission file filid opens, in bytes.
 *
 * A whole-repository submission for this repository measures well under this
 * (see `evidence/s3a-measurements.md`); the cap exists so a hostile or runaway
 * path cannot make the server read an unbounded file, and `facts-file-too-large`
 * tells the caller to split the batch.
 */
export const FACTS_SUBMISSION_MAX_BYTES = 64 * 1024 * 1024;

/**
 * Largest resolution-input file filid hashes, in bytes.
 *
 * Resolution inputs are manifests and lockfiles. A file above this is treated
 * as unreadable, which counts as changed, rather than read into memory.
 */
export const FACTS_RESOLUTION_INPUT_MAX_BYTES = 16 * 1024 * 1024;

/**
 * Largest project source file filid reads, in bytes.
 *
 * Source files are read only to hash them and to search for literal strings. A
 * file past this is not bound to any record: filid states that rather than
 * silently treating the record as stale, because re-extracting a file that is
 * too large to read reproduces the same refusal.
 */
export const FACTS_SOURCE_FILE_MAX_BYTES = 32 * 1024 * 1024;

/** Entries one `facts status` list carries inline before it reports a remainder. */
export const FACTS_STATUS_LIST_LIMIT = 200;

/** Project-level facts states (spec §3). */
export const FACTS_PROJECT_STATES = {
  UNINITIALIZED: 'facts-uninitialized',
  READY: 'ready',
} as const;

/** Per-file facts states (spec §3). */
export const FACTS_FILE_STATES = {
  EXACT: 'exact',
  UNSUPPORTED: 'unsupported',
  MISSING: 'missing',
  NEEDS_RESOLUTION: 'needs-resolution',
  UNCERTAIN: 'uncertain',
  TOOL_ERROR: 'tool-error',
} as const;

/**
 * Cause codes a facts state contributes to the graph's `unknownFiles`.
 *
 * One per state that leaves a file unknown, so a facts-derived unknown merges
 * with a graph-derived one without translating either.
 */
export const FACTS_UNKNOWN_CAUSES = {
  MISSING: 'facts-missing',
  NEEDS_RESOLUTION: 'facts-needs-resolution',
  UNCERTAIN: 'facts-uncertain',
  TOOL_ERROR: 'facts-tool-error',
} as const;

/** Provenance tiers a record may declare (spec §2.1, §4.6). */
export const FACTS_TIERS = {
  TOOL: 'tool',
  ATTESTED: 'attested',
} as const;

/** Reference kinds a provider may report, mirroring `DependencyReference`. */
export const FACTS_REFERENCE_KINDS = {
  STATIC: 'static',
  DYNAMIC: 'dynamic',
  RE_EXPORT: 're-export',
  FRAMEWORK: 'framework',
} as const;

/** How an item reached the side table (spec §4.5). */
export const FACTS_ADJUDICATION_ORIGINS = {
  MISSING_IN_STORE: 'missingInStore',
  RESOLUTION_DIFFERS: 'resolutionDiffers',
  COVERAGE_SHRANK: 'coverage-shrank',
  RESOLUTION_CHANGED: 'resolution-changed',
} as const;

/** Where one side-table item stands. */
export const FACTS_ADJUDICATION_STATES = {
  UNADJUDICATED: 'unadjudicated',
  PENDING_DISMISS: 'pending-dismiss',
  ADOPTED: 'adopted',
  DISMISSED: 'dismissed',
  CLOSED_BY_RECORD: 'closed-by-record',
} as const;

/** What an actor claims about one item. */
export const FACTS_DECISIONS = {
  ADOPT: 'adopt',
  DISMISS: 'dismiss',
} as const;

/** Public actions exposed by the facts dispatcher. */
export const FACTS_ACTIONS = {
  STATUS: 'status',
  SUBMIT: 'submit',
  COMPARE: 'compare',
  ADJUDICATE: 'adjudicate',
} as const;

/** Stable diagnostic codes emitted by the facts tool. */
export const FACTS_DIAGNOSTIC_CODES = {
  UNINITIALIZED: 'facts-uninitialized',
  EPOCH_MOVED: 'facts-epoch-moved',
  TREE_UNSTABLE: 'facts-tree-unstable',
  RECORD_CHANGED: 'facts-record-changed',
  SIDE_TABLE_CHANGED: 'facts-side-table-changed',
  ADJUDICATED_ITEMS_REMOVED: 'facts-adjudicated-items-removed',
  FILE_TOO_LARGE: 'facts-file-too-large',
  FILE_PATH_NOT_ABSOLUTE: 'facts-file-path-not-absolute',
  FILE_INSIDE_PROJECT: 'facts-file-inside-project',
  FILE_NOT_REGULAR: 'facts-file-not-regular',
  FILE_UNREADABLE: 'facts-file-unreadable',
  FILE_NOT_JSON: 'facts-file-not-json',
} as const;

/** Why one adjudication item was refused rather than applied. */
export const FACTS_ADJUDICATION_REFUSALS = {
  NO_SUCH_ITEM: 'facts-adjudication-no-such-item',
  REASON_REQUIRED: 'facts-adjudication-reason-required',
} as const;

/** Next actions of the per-item adjudication refusals, keyed like their codes. */
export const FACTS_ADJUDICATION_REFUSAL_NEXT_ACTIONS = {
  NO_SUCH_ITEM:
    'The side table holds no item with that kind, reference and resolved path for this file. Call facts status for this project: its unadjudicated list carries every open item with the kind, reference, resolvedPath and contentHash this action needs. Adjudicate one of those.',
  REASON_REQUIRED:
    'A dismissal says an edge is not there, so it carries the reason it is not. Send the same item again with a reason.',
} as const;

/** Code for a comparison asked against a generation with no frozen facts. */
export const FACTS_UNFROZEN_GENERATION_CODE = 'facts-generation-not-frozen';

/** Next action when a generation holds no frozen facts to compare against. */
export const FACTS_UNFROZEN_GENERATION_NEXT_ACTION =
  'Facts are not yet frozen into review generations, so there is nothing to compare against for that one. Call compare without generationId to compare against the live store.';

/** Refusal for an adjudicate call that named no actor. */
export const FACTS_ADJUDICATION_ACTOR_CODE = 'facts-adjudication-actor-required';

/** Next action when a call carried an actor identity that folds to nothing. */
export const FACTS_ADJUDICATION_ACTOR_NEXT_ACTION =
  'A dismissal is confirmed by a different actor, so every judgement names the one deciding. Send actor as a non-empty identity — it is folded to lowercase with surrounding space removed, so it must hold at least one other character — and adjudicate again with the same items.';

/** Stale-bytes refusal for a whole adjudicate call. */
export const FACTS_ADJUDICATION_STALE_CODE = 'facts-adjudication-stale-content';

/** Next action for a judgement made against bytes that have since changed. */
export const FACTS_ADJUDICATION_STALE_NEXT_ACTION =
  'This judgement was made against file bytes that have since changed, so it cannot be trusted. Read the lines the items name in the current file, then adjudicate again with the contentHash facts status now reports for this file.';

/** Per-record and per-reference rejection codes returned in `rejected[]`. */
export const FACTS_REJECTION_CODES = {
  SCHEMA_INVALID: 'facts-record-schema-invalid',
  HASH_MISMATCH: 'facts-content-hash-mismatch',
  OUT_OF_SCOPE: 'facts-record-out-of-scope',
  PATH_INVALID: 'facts-record-path-invalid',
  REFERENCE_ABSENT: 'facts-reference-absent',
  RESOLVED_PATH_INVALID: 'facts-resolved-path-invalid',
  RESOLUTION_INPUT_STALE: 'facts-resolution-input-stale',
  RESOLUTION_INPUT_UNREADABLE: 'facts-resolution-input-unreadable',
  SOURCE_UNREADABLE: 'facts-source-file-unreadable',
  EXPORTED_NAME_ABSENT: 'facts-exported-name-absent',
} as const;

/**
 * Next actions for a side-table page another writer took, keyed by the action.
 *
 * One code, three recoveries: the work a lost page costs is the work the losing
 * action was doing, so a submit re-submits, a compare re-compares and an
 * adjudicate re-reads the items before judging them again.
 */
export const FACTS_SIDE_TABLE_CONFLICT_NEXT_ACTIONS = {
  submit:
    'Another writer replaced the side table for these files between the read and the write, so their items were not stored. Call facts status, then submit those files again.',
  compare:
    'Another writer replaced the side table for these files between the read and the write, so their items were not stored. Run facts compare again with the same candidate file — the comparison is recomputed from the store each time.',
  adjudicate:
    'Another writer replaced this side-table page between the read and the write, so nothing was judged. Call facts status for the current items and contentHash, then adjudicate again.',
} as const;

/** Next actions of the facts diagnostics, keyed like their codes. */
export const FACTS_DIAGNOSTIC_NEXT_ACTIONS = {
  UNINITIALIZED:
    'The facts scope in effect covers no files, so there is nothing to analyse. Outside a review — editing project config during one dirties the worktree being reviewed — set facts.covers in the project .filid/config.json to the paths this project wants analysed, then call facts status again.',
  EPOCH_MOVED:
    'Nothing was stored. Re-extract the files this response lists as added or changed, then call submit again with the resolutionEpoch this response returned.',
  TREE_UNSTABLE:
    'The path list changed again on every retry, so re-extracting cannot converge. Use the added and removed paths to find what writes into the tree: delete those files, add them to .gitignore or facts.excludes, or stop the process writing them, then call facts status again.',
  RECORD_CHANGED:
    'Another writer replaced this record between the read and the write. Call facts status, then submit the affected files again.',
  SIDE_TABLE_CHANGED:
    'Another writer replaced the side table between the read and the write. Call facts status, then run the action that reported this again.',
  ADJUDICATED_ITEMS_REMOVED:
    'These files left the scanned tree or the facts scope, so the judgements recorded against them went with them; this is a report, not a refusal, and nothing is owed if the files are gone for good. If one was renamed, submit a record for the new path and run facts compare for it — an edge that still applies comes back as an item to judge there.',
  FILE_TOO_LARGE:
    'Split the extraction output into several JSON files, each under the byte cap this message names, and call submit once per file with the same resolutionEpoch.',
  FILE_PATH_NOT_ABSOLUTE:
    'Pass file as an absolute path to the extraction output.',
  FILE_INSIDE_PROJECT:
    'This path resolves inside the project tree. Write the extraction output outside it — an untracked file inside the tree joins the scanned path list and moves the epoch it is submitted against — then call submit with that path.',
  FILE_NOT_REGULAR:
    'Pass a path that resolves to a regular file. A directory, a FIFO or a device node is refused; a symbolic link is fine as long as it leads to a regular file outside the project. Then call submit again.',
  FILE_UNREADABLE:
    'Confirm the extraction output exists at that path and is readable by the filid server process, then call submit again.',
  FILE_NOT_JSON:
    'The file at that path is not the JSON array of FileFacts records submit reads. Re-run the extraction program, confirm its output parses as JSON, and call submit again.',
} as const;

/** Next actions of the per-record and per-reference rejections. */
export const FACTS_REJECTION_NEXT_ACTIONS = {
  SCHEMA_INVALID:
    'Fix the record at the JSON pointer this rejection names so it matches the FileFacts schema, then submit that file again.',
  HASH_MISMATCH:
    'The file changed after it was extracted. Re-extract that file and submit it again.',
  OUT_OF_SCOPE:
    'Submission cannot widen the scope. Either drop this record, or add the path to facts.covers in the project .filid/config.json and submit again.',
  PATH_INVALID:
    'This path is not in the scanned path list — most often because git ignores it, it or a parent is dot-prefixed, or it sits in an excluded directory — or it does not stay inside the project as a project-relative POSIX path. Either drop this record, or bring the file into the scan by adjusting .gitignore, structure.additionalExcludedDirectories or the facts scope, then submit again.',
  REFERENCE_ABSENT:
    'The string this reference reports is not in the file. Re-extract the file with a tool that reads its current bytes, or submit an attested record that accounts for the line.',
  RESOLVED_PATH_INVALID:
    'The resolved path leaves the project, crosses a symbolic link, spells an entry differently than the directory does, or names a directory. Re-resolve it against the project tree and submit that record again.',
  RESOLUTION_INPUT_STALE:
    'A file this record declared as a resolution input no longer hashes to the value the record carries. Re-extract this file so its provenance names the current inputs, then submit it again.',
  RESOLUTION_INPUT_UNREADABLE:
    'filid cannot read a file this record declared as a resolution input — it is missing, not a regular file, past the size cap, or the server lacks permission. Re-extracting will hit the same refusal, so change one of three things: drop that path from the record provenance, make the file readable by the filid server as a regular file, or submit this file as attested.',
  SOURCE_UNREADABLE:
    'filid cannot read this project file as a regular file within its size cap, so no record can be bound to its bytes. Re-extracting will hit the same refusal: either make the file readable and small enough, or put it outside the facts scope with facts.excludes in the project .filid/config.json.',
  EXPORTED_NAME_ABSENT:
    'The exported name this record reports is not in the file. Re-extract the file and submit it again.',
} as const;

/**
 * Where extraction output must go, as `facts status` states it.
 *
 * A requirement rather than a path: the MCP server runs outside the agent's
 * sandbox, so the server's own temp directory is measurably not writable by the
 * agent, and naming it would point every caller at a place it cannot use. The
 * submission guard judges whatever path the agent actually supplies.
 */
export const FACTS_OUTPUT_REQUIREMENT =
  'Write extraction output to any directory outside the project tree that this agent can write and the filid server can read — your TMPDIR is the usual choice. A file inside the project joins the scanned path list and moves the epoch it is submitted against.';

/** Human-readable description advertised for the facts MCP tool. */
export const FACTS_TOOL_DESCRIPTION =
  'Report the facts filid holds about a project, and accept agent-extracted reference facts that pass hash, string-existence and resolved-path checks.';
