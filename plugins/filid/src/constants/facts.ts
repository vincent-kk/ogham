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

/** Public actions exposed by the facts dispatcher. */
export const FACTS_ACTIONS = {
  STATUS: 'status',
  SUBMIT: 'submit',
} as const;

/** Stable diagnostic codes emitted by the facts tool. */
export const FACTS_DIAGNOSTIC_CODES = {
  UNINITIALIZED: 'facts-uninitialized',
  EPOCH_MOVED: 'facts-epoch-moved',
  TREE_UNSTABLE: 'facts-tree-unstable',
  RECORD_CHANGED: 'facts-record-changed',
  FILE_TOO_LARGE: 'facts-file-too-large',
  FILE_PATH_NOT_ABSOLUTE: 'facts-file-path-not-absolute',
  FILE_INSIDE_PROJECT: 'facts-file-inside-project',
  FILE_NOT_REGULAR: 'facts-file-not-regular',
  FILE_UNREADABLE: 'facts-file-unreadable',
  FILE_NOT_JSON: 'facts-file-not-json',
} as const;

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

/** Next actions of the facts diagnostics, keyed like their codes. */
export const FACTS_DIAGNOSTIC_NEXT_ACTIONS = {
  UNINITIALIZED:
    'Declare the facts scope before submitting: set facts.covers (and optionally facts.excludes) in the project .filid/config.json, then call facts status again.',
  EPOCH_MOVED:
    'Nothing was stored. Re-extract the files this response lists as added or changed, then call submit again with the resolutionEpoch this response returned.',
  TREE_UNSTABLE:
    'The path list changed again on every retry, so re-extracting cannot converge. Use the added and removed paths to find what writes into the tree: delete those files, add them to .gitignore or facts.excludes, or stop the process writing them, then call facts status again.',
  RECORD_CHANGED:
    'Another writer replaced this record between the read and the write. Call facts status, then submit the affected files again.',
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
