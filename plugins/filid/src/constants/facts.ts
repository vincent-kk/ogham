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

/**
 * Contract group ids one record may report.
 *
 * A spec document links a handful of acceptance groups; a list past this is a
 * record the server should not spend a line scan on, so it is refused by the
 * schema rather than checked marker by marker.
 */
export const FACTS_CONTRACT_GROUP_LIMIT = 64;

/**
 * How long a contract group id may be.
 *
 * The server searches every line of the file for the marker and then for this
 * id, so the id's length is a per-line cost. The longest acceptance-group id
 * in this repository is 32 characters, and a DETAIL heading has to carry the
 * same text, so this leaves room without letting a record spend the scan on a
 * string no marker would hold.
 */
export const FACTS_CONTRACT_GROUP_ID_MAX_LENGTH = 128;

/**
 * The shape of a contract group id, as the extractor's marker scanner reads it.
 *
 * Kept identical to `\bfilid:contract\s+([A-Za-z][A-Za-z0-9._-]*)`: an id the
 * scanner could never produce cannot be on any line, so the schema refuses it
 * instead of letting the line check report it absent. The extractor's grammar
 * is canonical; this pattern follows it.
 */
export const FACTS_CONTRACT_GROUP_ID_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/;

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
  /** The store could not read the judgements that would settle this file. */
  JUDGEMENTS_UNREADABLE: 'facts-judgements-unreadable',
  /** This file's judgements were discarded and nobody has re-derived them. */
  JUDGEMENTS_DISCARDED: 'facts-judgements-discarded',
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
  ATTESTED_NON_REFERENCE: 'attested-non-reference',
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
  DISCARD_PENDING: 'discard-pending',
  DISCARD_DAMAGED: 'discard-damaged',
} as const;

/**
 * Line patterns that make a line owe an explanation in an attested record.
 *
 * The extraction program's `HIDDEN_REFERENCE_PATTERNS` is canonical; this copy
 * must cover every line those patterns see, and a parity test holds the two to
 * the same lines. The server keeps its own copy because the line accounting
 * runs where no extractor does — it is string matching of the same class as the
 * existence check in spec §4.2, not interpretation (P1). Non-global on purpose:
 * a global regular expression carries `lastIndex` across calls, and a
 * module-level constant reused per line would then skip lines depending on what
 * came before them.
 *
 * The conventions pack (§7) is where a language's pattern will live.
 */
export const FACTS_REFERENCE_LINE_PATTERNS: readonly RegExp[] = [
  /(?<![\w$.])from\s*(['"])[^'"\n]+\1/,
  /(?<![\w$.])import\s*\(\s*(['"])[^'"\n]+\1/,
  /(?<![\w$.])import\s+(['"])[^'"\n]+\1/,
  /(?<![\w$.])require\s*\(\s*(['"])[^'"\n]+\1/,
];

/**
 * The language-agnostic fallback the accounting check adds to the defaults.
 *
 * Deliberately wide (spec §4.6): a line filid cannot recognise as a reference is
 * a line whose omission nobody would notice, so the cost of over-matching —
 * prose containing `use` or `from` has to be listed in `nonReferences` — is paid
 * in the direction that cannot hide an edge.
 */
export const FACTS_REFERENCE_FALLBACK_PATTERN =
  /(?<![\w$])(?:import|require|include|use|from)(?![\w$])/;

/**
 * Next action of an axis that found no record it could read for a file.
 *
 * One sentence for every axis that reads a record, because the way out is the
 * same for all of them: the facts come from outside the server, so the answer
 * is the bootstrap loop, not another call to the tool that reported the gap
 * (spec §3, §8a). It names the loop rather than a single step so a caller that
 * arrives here from any axis can finish it without reading another document.
 */
export const FACTS_RECORD_UNAVAILABLE_NEXT_ACTION =
  'Run the facts bootstrap for this project: call facts status, extract the files it lists with the extraction program named in its output requirement, and submit those records with the resolutionEpoch it returned. Report this axis as indeterminate until a usable record exists for the file, never as passing.';

/**
 * Next action for a record that binds but reports nothing on one axis.
 *
 * Distinct from the bootstrap sentence, and that distinction is the whole
 * point: the bootstrap extracts the files `facts status` lists, and status
 * lists only what is missing or stale — an `exact` record whose optional
 * section is absent is on neither list, so pointing at the bootstrap would
 * repeat this diagnostic forever (P5). The way out is to extract that one
 * file with a tool that reports the section, which the bootstrap document
 * already describes as passing project-relative paths to the extractor.
 */
export const FACTS_SECTION_UNAVAILABLE_NEXT_ACTION =
  'This file has a record filid accepts, but that record reports nothing for this axis, and calling the bootstrap again would re-extract nothing — status lists only files whose records are missing or stale. Extract this one path again with a tool that reports the section (the extraction program takes project-relative paths as positional arguments) and submit it, or submit an attested record for it that carries the section. Report this axis as indeterminate for this file until then.';

/**
 * Next action for a file an axis has to judge that the facts scope excludes.
 *
 * Distinct from the out-of-scope count report, which owes nothing because no
 * rule needed those files. Here a rule does need this one — a discovered
 * verification file, say — so the way out is to widen the scope and bootstrap
 * it, and the axis stays indeterminate until a record exists.
 */
export const FACTS_SCOPE_EXCLUDES_JUDGED_FILE_NEXT_ACTION =
  'This file has to be judged but the facts scope excludes it, so no record can exist for it. Outside a review — editing project config during one dirties the worktree being reviewed — add its path to facts.covers in the project .filid/config.json and run the facts bootstrap for it. Report this axis as indeterminate until then, never as passing.';


/** Directory under the facts store holding unconfirmed attested submissions. */
export const FACTS_PENDING_DIRECTORY = 'pending';

/** What one attested record's submission did (`evidence/s3a-attested-states.md`). */
export const FACTS_ATTESTATION_OUTCOMES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  MISMATCH: 'mismatch',
  SAME_ACTOR: 'same-actor',
  REPLACED: 'replaced',
} as const;

/**
 * Next actions of the attestation outcomes, keyed by the outcome itself.
 *
 * By value rather than by name because the value is what a response carries: a
 * report can look its own next action up without a second table to keep aligned.
 */
export const FACTS_ATTESTATION_NEXT_ACTIONS = {
  [FACTS_ATTESTATION_OUTCOMES.PENDING]:
    'Stored as an unconfirmed attestation, so this file stays uncertain. Have a DIFFERENT actor read the same file independently — the skill stands up a separate subagent — and submit its own attested record for it. Matching records confirm it; a different answer is reported rather than stored.',
  [FACTS_ATTESTATION_OUTCOMES.CONFIRMED]:
    'A second actor agreed, so the attested record is now the file record. Nothing further is owed for it.',
  [FACTS_ATTESTATION_OUTCOMES.MISMATCH]:
    'Nothing was stored and the pending attestation is unchanged, because replacing it would let two actors overwrite each other forever. Read the lines this response names in the current file and submit a record that settles them; if the pending attestation is the wrong one, call facts discard-pending for this path first.',
  [FACTS_ATTESTATION_OUTCOMES.SAME_ACTOR]:
    'A submission confirms nothing when it comes from the actor that already attested this file. Have a different actor submit its own attested record; if you now believe the pending attestation is wrong, call facts discard-pending for this path.',
  [FACTS_ATTESTATION_OUTCOMES.REPLACED]:
    'The file changed since the pending attestation was made, so it was dropped and this submission became the new first one. Have a different actor attest the CURRENT bytes to confirm it.',
} as const;

/** Code reported when an attested record leaves a matching line unexplained. */
export const FACTS_ATTESTATION_PENDING_CODE = 'facts-attestation-pending';

/**
 * What an attested record has to carry, as `facts status` states it.
 *
 * Stated in every status response for the same reason `outputRequirement` is:
 * the bootstrap loop (spec §8a) has to work for an agent that has only the
 * responses, and a file that needs attestation is precisely the case where no
 * tool output is coming to explain the shape.
 */
export const FACTS_ATTESTED_REQUIREMENT =
  'Attestation is how a file settles when no tool can settle it: one filid reports as tool-error, one whose claims are rejected in a way re-extraction reproduces, or one still uncertain after every item is judged. An attested record is an ordinary FileFacts record with provenance.tier set to attested: it still binds to the file contentHash, every reference string must be in the file, and every resolved path must be valid. Two things are added. Every line that looks like a reference must be accounted for — by a reference that quotes it, or by an entry in nonReferences: { line, reason } — and a refusal names the lines that are not. And one submission never settles a file: the record is held unconfirmed until a DIFFERENT actor, reading the same bytes independently, submits the same set of references and resolutions.';

/** Stable diagnostic codes emitted by the facts tool. */
/**
 * Next action for a file whose judgements the store could not be read for.
 *
 * Two repairs, because there are two damages and the response names which one.
 * A shard whose JSON is broken is discarded by an explicit call — an ordinary
 * submit does not reach it, because a side-table write happens only where a
 * disagreement is detected and the disagreements are exactly what did not
 * read. One the process cannot read is repaired outside filid, by making it
 * readable.
 */
/** Refusal code for a `discard-damaged` call naming a shard that is not damaged. */
export const FACTS_SHARD_NOT_DAMAGED_CODE = 'facts-shard-not-damaged';

/**
 * Next action after discarding a damaged judgement shard.
 *
 * Discarding ends the block; it does not bring the judgements back. The edges
 * an adopted item carried are gone, so the way to find them again is the one
 * that found them the first time — an independent extraction compared against
 * the store, which reopens every disagreement as an item.
 */
export const FACTS_DAMAGED_DISCARDED_NEXT_ACTION =
  'The shard is gone, and the files it covered are now held uncertain by the discard itself rather than by the damage: what it held is not recovered. Call facts status and, for every entry of data.awaitingComparison, extract that file with a program whose provenance.tool differs from the entry\'s storedTool — or read it yourself and submit it attested — then call facts compare with that candidate, which reopens every edge the store does not carry as an item to judge and clears the file. A dismissal that was lost costs nothing — the edge stays in place — but an adopted one is only found again this way.';

/**
 * Next action for a file whose discarded judgements nobody has re-derived.
 *
 * The discard ended the block and opened this one deliberately: leaving the file
 * settled would let a caller that skipped the comparison conclude over an edge
 * an adopted item carried and nothing now holds.
 */
export const FACTS_JUDGEMENTS_DISCARDED_NEXT_ACTION =
  'Do not treat these files as settled: their judgements were discarded as unreadable, so an edge an adopted item carried may be gone with nothing left to say so. For every entry of data.awaitingComparison, extract that file with a program whose provenance.tool differs from the entry\'s storedTool — or read it yourself and submit it attested — and call facts compare with that candidate. A candidate from the same tool reproduces the record instead of re-deriving it and is refused with facts-comparison-not-independent.';

/** A discard that dropped unconfirmed attestations rather than judgements. */
export const FACTS_PENDING_DISCARDED_CODE =
  'facts-pending-attestations-discarded';

/**
 * Next action after discarding a damaged pending shard.
 *
 * Nothing is owed: an unconfirmed attestation is one reader's claim that a
 * second never agreed to, so dropping it removes no edge and holds no file.
 * Each file returns to whatever its own record gives it.
 */
export const FACTS_PENDING_DISCARDED_NEXT_ACTION =
  'Nothing is held by this discard and no edge was lost: what the shard carried was attested submissions a second actor had not confirmed, which never entered any file\'s references. Each file the shard covered reads as its own record leaves it. Call facts status: a file that still needs an attested reading is named there, with the actor it must not repeat and the bytes to read.';

/** A comparison that cannot re-derive what a discard lost. */
export const FACTS_COMPARISON_NOT_INDEPENDENT_CODE =
  'facts-comparison-not-independent';

/** A comparison measured against a generation rather than against the store. */
export const FACTS_COMPARISON_NOT_AGAINST_STORE_CODE =
  'facts-comparison-not-against-store';

/**
 * Next action for a comparison whose baseline was a generation's frozen facts.
 *
 * The loss a discard leaves happened in the store after the freeze, so a frozen
 * baseline cannot see it: the candidate and the freeze can both carry the edge
 * the store no longer has, report no difference, and clearing the mark on that
 * nothing is the outcome the mark exists to prevent.
 */
export const FACTS_COMPARISON_AGAINST_STORE_NEXT_ACTION =
  'Call facts compare again with the same candidate file and no generationId. A comparison against a generation measures the candidate against what the review was judged on, not against what the store holds now, so it cannot re-derive the judgements a discard took — the files stay listed in data.awaitingComparison of facts status until a comparison against the store clears them. The comparison just run is recorded as usual; only the mark is untouched.';

export const FACTS_JUDGEMENTS_UNREADABLE_NEXT_ACTION =
  'Do not treat this file as settled: the side-table shard that would hold its judgements did not read, so an adopted edge or an open item may be invisible. The response names the shard and which of the two it is. For an unparseable shard, call facts discard-damaged with that shard name — nothing else can write it, because the items that would be written are the ones nobody can read — and follow the next action it returns. For an unreadable one, restore read access to that file under the plugin cache, then call facts status again.';

export const FACTS_DIAGNOSTIC_CODES = {
  UNINITIALIZED: 'facts-uninitialized',
  EPOCH_MOVED: 'facts-epoch-moved',
  TREE_UNSTABLE: 'facts-tree-unstable',
  RECORD_CHANGED: 'facts-record-changed',
  SIDE_TABLE_CHANGED: 'facts-side-table-changed',
  ADJUDICATED_ITEMS_REMOVED: 'facts-adjudicated-items-removed',
  PENDING_CHANGED: 'facts-pending-attestation-changed',
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
  'That generation holds no frozen facts filid can read — it was prepared before facts were frozen, its directory is gone, or its facts.json no longer matches the digest its state recorded. Call compare without generationId to compare against the live store, or run review_state prepare once for that branch to freeze the facts again.';

/** Refusal code for a `generationId` that cannot name a generation at all. */
export const FACTS_GENERATION_ID_INVALID_CODE = 'facts-generation-id-invalid';

/**
 * Next action for a malformed `generationId`.
 *
 * Refused before it reaches a path: a value shaped like a path traversal is an
 * argument that never named a generation, and answering it with "no frozen
 * facts" would say the store looked.
 */
export const FACTS_GENERATION_ID_INVALID_NEXT_ACTION =
  'Pass generationId exactly as the review handoff reported it — 32 hexadecimal characters — or omit it to compare against the live store.';

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
  CONTRACT_GROUP_ABSENT: 'facts-contract-group-absent',
  ATTESTED_UNACCOUNTED: 'facts-attested-unaccounted-lines',
  ATTESTED_ACTOR_REQUIRED: 'facts-attested-actor-required',
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
  PENDING_CHANGED:
    'Another writer replaced the pending attestation store between the read and the write, so these attested records were not stored. Call facts status to see which files still hold a pending attestation, then submit those attested records again.',
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

/**
 * Next actions of the rejections, keyed by the code itself.
 *
 * By value rather than by name because the stored record keeps the code and
 * nothing else: `status` looks the sentence up when it reports the rejection,
 * so the wording lives in one place instead of being copied into every record
 * where it would go stale the first time it is improved.
 */
export const FACTS_REJECTION_NEXT_ACTIONS = {
  [FACTS_REJECTION_CODES.SCHEMA_INVALID]:
    'Fix the record at the JSON pointer this rejection names so it matches the FileFacts schema, then submit that file again.',
  [FACTS_REJECTION_CODES.HASH_MISMATCH]:
    'The file changed after it was extracted. Re-extract that file and submit it again.',
  [FACTS_REJECTION_CODES.OUT_OF_SCOPE]:
    'Submission cannot widen the scope. Either drop this record, or add the path to facts.covers in the project .filid/config.json and submit again.',
  [FACTS_REJECTION_CODES.PATH_INVALID]:
    'This path is not in the scanned path list — most often because git ignores it, it or a parent is dot-prefixed, or it sits in an excluded directory — or it does not stay inside the project as a project-relative POSIX path. Either drop this record, or bring the file into the scan by adjusting .gitignore, structure.additionalExcludedDirectories or the facts scope, then submit again.',
  [FACTS_REJECTION_CODES.REFERENCE_ABSENT]:
    'The string this reference reports is not in the file. Re-extract the file with a tool that reads its current bytes, or submit an attested record that accounts for the line.',
  [FACTS_REJECTION_CODES.RESOLVED_PATH_INVALID]:
    'The resolved path leaves the project, crosses a symbolic link, spells an entry differently than the directory does, or names a directory. Re-resolve it against the project tree and submit that record again.',
  [FACTS_REJECTION_CODES.RESOLUTION_INPUT_STALE]:
    'A file this record declared as a resolution input no longer hashes to the value the record carries. Re-extract this file so its provenance names the current inputs, then submit it again.',
  [FACTS_REJECTION_CODES.RESOLUTION_INPUT_UNREADABLE]:
    'filid cannot read a file this record declared as a resolution input — it is missing, not a regular file, past the size cap, or the server lacks permission. Re-extracting will hit the same refusal, so change one of three things: drop that path from the record provenance, make the file readable by the filid server as a regular file, or submit this file as attested.',
  [FACTS_REJECTION_CODES.SOURCE_UNREADABLE]:
    'filid cannot read this project file as a regular file within its size cap, so no record can be bound to its bytes. Re-extracting will hit the same refusal: either make the file readable and small enough, or put it outside the facts scope with facts.excludes in the project .filid/config.json.',
  [FACTS_REJECTION_CODES.EXPORTED_NAME_ABSENT]:
    'The exported name this record reports is not in the file. Re-extract the file and submit it again.',
  [FACTS_REJECTION_CODES.CONTRACT_GROUP_ABSENT]:
    'No "filid:contract <group-id>" marker in the file names the contract group this record reports. Re-extract the file and submit it again, or add the marker to the spec document if the link is the one you meant.',
  [FACTS_REJECTION_CODES.ATTESTED_UNACCOUNTED]:
    'An attested record accounts for every line that looks like a reference. The lines this rejection names are explained by neither a reference nor a nonReferences entry. Read those exact lines and submit the record again with each one either quoted by a reference or listed in nonReferences with the reason it is not one.',
  [FACTS_REJECTION_CODES.ATTESTED_ACTOR_REQUIRED]:
    'An attested record is confirmed by a DIFFERENT actor, so the server has to know who is claiming it. Send the submit call again with actor set to a non-empty identity for whoever read this file.',
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
