import type {
  FACTS_ACTIONS,
  FACTS_ATTESTATION_OUTCOMES,
  FACTS_PROJECT_STATES,
} from '../../../../constants/facts.js';
import type {
  AdjudicationDecision,
  AdjudicationKey,
  AdjudicationOrigin,
  AdjudicationState,
  AttestationDifference,
  FactsRejection,
} from '../../../../core/facts/index.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';

/** One decision a caller sends for one side-table item. */
export interface AdjudicateDecisionInput {
  kind: AdjudicationKey['kind'];
  /** `sourceText ?? specifier`, exactly as the item names it. */
  reference: string;
  /** The in-project path the item claims the reference resolves to. */
  resolvedPath: string;
  decision: AdjudicationDecision;
  /** Required for a dismissal; ignored for an adoption. */
  reason?: string;
}

/** Input of the adjudicate action. */
export interface AdjudicateInput {
  action: typeof FACTS_ACTIONS.ADJUDICATE;
  /** Absolute project root, as every facts action spells it. */
  path: string;
  /** Project-relative POSIX path of the file being judged. */
  sourcePath: string;
  /** The bytes the caller read before deciding. */
  contentHash: string;
  /** Self-declared actor; the server cannot verify who this is. */
  actor: string;
  items: AdjudicateDecisionInput[];
}

/**
 * One side-table item, carrying every field an `adjudicate` call needs.
 *
 * The loop only closes if the agent can reach an item it never saw created: an
 * item opened by one submission is invisible to a later `compare` that derives
 * the same candidate, so an answer that reports only paths leaves `adjudicate`
 * guessing a key it cannot know and being refused for guessing wrong (P5).
 * Everything `adjudicate` requires — `kind`, `reference`, `resolvedPath` and the
 * file's current `contentHash` — is therefore quoted back verbatim, and the
 * lines are quoted with it so the reader can judge the text rather than the key.
 */
export interface FactsOpenItem {
  /** Project-relative POSIX path of the file the reference sits in. */
  path: string;
  kind: AdjudicationKey['kind'];
  /** `sourceText ?? specifier`, spelled as `adjudicate` must repeat it. */
  reference: string;
  /** The in-project path this item claims the reference resolves to. */
  resolvedPath: string;
  /** How the item reached the table. */
  origin: AdjudicationOrigin;
  /** Where it stands now. */
  state: AdjudicationState;
  /** 1-based lines the reference occurs on in the file as it now stands. */
  lines: number[];
  /** The file's current digest — the `contentHash` an adjudicate call carries. */
  contentHash: string;
  /** True when the state on record was reached against different bytes. */
  staleUnderNewContent: boolean;
  /** The actor whose dismissal is waiting on a second reader. */
  actor?: string;
  /** Why that actor says the edge is not there. */
  reason?: string;
}

/** Input of the discard-pending action. */
export interface DiscardPendingInput {
  action: typeof FACTS_ACTIONS.DISCARD_PENDING;
  /** Absolute project root. */
  path: string;
  /** Project-relative POSIX paths whose pending attestation to drop. */
  sourcePaths: string[];
}

/** Input of the `discard-damaged` action. */
export interface DiscardDamagedInput {
  action: typeof FACTS_ACTIONS.DISCARD_DAMAGED;
  /** Absolute project root. */
  path: string;
  /** Shard file names, exactly as the status diagnostic reported them. */
  shards: string[];
}

/** What `discard-damaged` reports about one call. */
export interface FactsDiscardDamagedSummary {
  /** Shards whose unreadable contents this call dropped. */
  discarded: number;
  /** Named shards that were not damaged, so nothing was dropped for them. */
  refused: number;
  /**
   * Scanned files this discard now holds uncertain, awaiting a comparison.
   *
   * Side-table shards only: a discarded pending shard marks nothing, and
   * counting its files here would send the caller to look for them in an empty
   * `awaitingComparison`.
   */
  affectedFiles: number;
}

/** Which shards `discard-damaged` dropped and which it refused. */
export interface FactsDiscardDamagedData {
  /** Shard file names this call emptied. */
  discarded: string[];
  /** Shard file names it refused, because the store reads them fine. */
  refused: string[];
}

/** What `discard-pending` reports about one call. */
export interface FactsDiscardPendingSummary {
  /** Pending attestations this call removed. */
  discarded: number;
  /** Paths that held none; reported, not refused. */
  absent: number;
  /** False when a concurrent writer took a shard and something stayed. */
  stored: boolean;
}

/** Which paths `discard-pending` cleared and which held nothing. */
export interface FactsDiscardPendingData {
  discarded: string[];
  absent: string[];
}

/** Where one attested submission landed in the state table. */
export type FactsAttestationOutcome =
  (typeof FACTS_ATTESTATION_OUTCOMES)[keyof typeof FACTS_ATTESTATION_OUTCOMES];

/** What one attested record's submission did, and what is owed next. */
export interface AttestedOutcome {
  /** Project-relative POSIX path the record describes. */
  path: string;
  outcome: FactsAttestationOutcome;
  /** The actor holding the pending attestation, when one is involved. */
  actor?: string;
  /**
   * References only one of the two attestations carries, with their lines.
   *
   * Present for a disagreement and for a same-actor resubmission that differs
   * from what that actor said before; the lines are what the reader has to open
   * to settle it.
   */
  differences?: (AttestationDifference & { lines: number[] })[];
  /** The one action that changes this file's state. */
  nextAction: string;
}

/** Input of the compare action. */
export interface CompareInput {
  action: typeof FACTS_ACTIONS.COMPARE;
  /** Absolute project root. */
  path: string;
  /** Absolute path of the candidate extraction, outside the project. */
  file: string;
  /** Review generation whose frozen facts to compare against, when given. */
  generationId?: string;
}

/** One reference as a comparison bucket reports it. */
export interface ComparedReference {
  /** Project-relative path of the file it sits in. */
  path: string;
  reference: string;
  kind: AdjudicationKey['kind'];
  /** In-project target, or null when the resolution carries no edge. */
  resolvedPath: string | null;
}

/** What `compare` reports about one call. */
export interface FactsCompareSummary {
  comparedFiles: number;
  missingInStore: number;
  resolutionDiffers: number;
  informational: number;
  /** Items the side table holds for the compared files afterwards. */
  recordedItems: number;
  /** How many of those still await a decision. */
  openItems: number;
  /**
   * True while only one provider's facts exist to compare against.
   *
   * A property of the result, not a question for anyone: re-running the same
   * tool catches transcription slips and nothing else.
   */
  singleProvider: boolean;
}

/** The per-reference evidence behind a compare summary. */
export interface FactsCompareData {
  missingInStore: ComparedReference[];
  missingInCandidate: ComparedReference[];
  resolutionDiffers: ComparedReference[];
  informational: ComparedReference[];
  /**
   * Every item the compared files' pages hold afterwards, judged or not.
   *
   * Not only the ones this comparison produced: an item another action opened is
   * work the agent still owes, and a comparison that hides it makes the item
   * unreachable until some run happens to derive the same difference again.
   */
  sideTableItems: FactsOpenItem[];
  /**
   * Files whose items this call could not record, when another writer won.
   *
   * Absent when everything landed. The buckets above report what the
   * comparison derived, which is not the same question as what the store now
   * holds: without this list a caller reading the data alone cannot tell the
   * two apart.
   */
  unrecorded?: FactsFileList;
}

/** Action-discriminated input accepted by the public facts tool. */
export type FactsInput =
  | { action: typeof FACTS_ACTIONS.STATUS; path: string }
  | {
      action: typeof FACTS_ACTIONS.SUBMIT;
      path: string;
      file: string;
      resolutionEpoch: string;
      /** Required only when the batch carries an attested record. */
      actor?: string;
    }
  | AdjudicateInput
  | CompareInput
  | DiscardPendingInput
  | DiscardDamagedInput;

/** What `adjudicate` reports about one call. */
export interface FactsAdjudicateSummary {
  sourcePath: string;
  /** Items whose state this call moved. */
  applied: number;
  /** Items the table would not accept a decision for. */
  refused: number;
  /** Dismissals still waiting on a different actor. */
  awaitingConfirmation: number;
  /** False when a concurrent writer took the page and nothing was stored. */
  stored: boolean;
}

/** The per-item evidence behind an adjudicate summary. */
export interface FactsAdjudicateData {
  outcomes: {
    reference: string;
    resolvedPath: string;
    state: AdjudicationState;
    changed: boolean;
    /** Empty when nothing further is owed for this item. */
    nextAction: string;
  }[];
  refused: { reference: string; code: string; nextAction: string }[];
}

/**
 * One claim filid refused, as `status` reports it back.
 *
 * Everything the caller needs to choose a different action: the code says which
 * refusal it is, the sentence says what changes it, and the specifier and lines
 * say where to look. No file text — a path, a string the caller itself
 * submitted, and line numbers.
 */
export interface RejectedClaim {
  /** Project-relative POSIX path of the record the claim belonged to. */
  path: string;
  /** Stable reason code, as the submit response spelled it. */
  code: string;
  /** The one action that changes this outcome. */
  nextAction: string;
  /** The reference's specifier, on a reference-level rejection. */
  specifier?: string;
  /** The declared resolution input that caused it, path only. */
  inputPath?: string;
  /** 1-based lines the caller has to read, where filid could name them. */
  lines?: number[];
}

/**
 * One file held uncertain by a discard until somebody re-derives its judgements.
 *
 * No file text: a path and a tool name the caller itself submitted.
 */
export interface AwaitingComparisonFile {
  /** Project-relative POSIX path whose judgements the discard took. */
  path: string;
  /**
   * `provenance.tool` of the stored record, when one is readable.
   *
   * The comparison that clears this file must NOT declare it; absent means no
   * record is stored, so any candidate re-derives rather than reproduces.
   */
  storedTool?: string;
}

/** One capped list plus how many entries it left out. */
export interface FactsFileList {
  paths: string[];
  truncated: number;
}

/** What `status` reports without the caller reading any list. */
export interface FactsStatusSummary {
  projectState: (typeof FACTS_PROJECT_STATES)[keyof typeof FACTS_PROJECT_STATES];
  resolutionEpoch: string;
  coveredFiles: number;
  exact: number;
  missing: number;
  needsResolution: number;
  uncertain: number;
  toolError: number;
  unsupported: number;
  /** Side-table items awaiting a decision across every in-scope file. */
  unadjudicatedItems: number;
  /** Attested submissions held unconfirmed across every in-scope file. */
  pendingAttestations: number;
  /**
   * What an attested record has to carry, stated as a requirement.
   *
   * Always present, like `outputRequirement`: a file that needs attestation is
   * exactly the case where no tool output is coming to show the shape, so the
   * bootstrap loop has to work from this response alone.
   */
  attestationRequirement: string;
  /**
   * Where extraction output must go, stated as a requirement.
   *
   * Not a server-side path: the server's temp directory is not writable by the
   * sandboxed agent, so the caller picks a directory meeting this requirement
   * and the submission guard judges that path.
   */
  /**
   * Where the facts scope came from.
   *
   * `default` means the project declared none and filid used the adapters'
   * source extensions; a report that says what was analysed has to say this,
   * because nobody wrote that scope down.
   */
  scopeSource: 'config' | 'default';
  outputRequirement: string;
  /**
   * Where filid wrote the list of files to extract, and how many it holds.
   *
   * The agent passes `path` straight to its extractor's `--files-from`. The
   * server owns the scope, so the extractor needs no project knowledge.
   * `unrepresentable` counts in-scope files whose names a line-oriented list
   * cannot carry; they are absent from the file and stay `missing`.
   */
  extractionList: { path: string; count: number; unrepresentable: number };
}

/** The per-file lists behind a status summary. */
export interface FactsStatusData {
  missing: FactsFileList;
  needsResolution: FactsFileList;
  uncertain: FactsFileList;
  toolError: FactsFileList;
  /**
   * Files carrying a reference the provider could not vouch for.
   *
   * One of the reasons a file is `uncertain` that no other list in this
   * response names. Together, `rejected`, `unadjudicated`,
   * `pendingAttestations`, `awaitingComparison` and this account for every
   * uncertain path except one: a file held by a `facts-judgements-unreadable`
   * diagnostic is in no list, because what did not read is what would have
   * named it. The reasons are listed rather than counted — a count is what
   * goes stale the next time one is added.
   */
  indeterminate: FactsFileList;
  /**
   * Files whose judgements a discard took and nobody has re-derived.
   *
   * Each carries the `provenance.tool` of the stored record, because the
   * comparison that clears the file has to come from a different one; without
   * it the next action would be a guess (spec §3).
   */
  awaitingComparison: { items: AwaitingComparisonFile[]; truncated: number };
  /** Every refused claim, with the action that changes it. */
  rejected: { items: RejectedClaim[]; truncated: number };
  /**
   * Every side-table item awaiting a decision, with what judging it requires.
   *
   * Item-level rather than a path list: this is the entry point of the
   * bootstrap loop (spec §8a), and an agent that can only be told which files
   * are unsettled has to guess the rest of the adjudicate call.
   */
  unadjudicated: { items: FactsOpenItem[]; truncated: number };
  /**
   * Files holding an attested submission nobody has confirmed yet.
   *
   * Each names the actor that must NOT be the one confirming it, and the bytes
   * the confirmation has to read, so the next submission can be built from this
   * response alone.
   */
  pendingAttestations: {
    path: string;
    actor: string;
    contentHash: string;
    nextAction: string;
  }[];
}

/** What `submit` reports about one call. */
export interface FactsSubmitSummary {
  resolutionEpoch: string;
  accepted: number;
  removed: number;
  rejectedRecords: number;
  rejectedClaims: number;
  /** True when nothing was stored because the epoch had moved. */
  epochMoved: boolean;
  /** Edges this batch walked back, now on the side table awaiting judgement. */
  openedItems: number;
  /** Side-table items this batch settled by carrying the edge after all. */
  closedItems: number;
  /** Attested records stored unconfirmed, awaiting a second actor. */
  attestationsPending: number;
  /** Attested records a second actor confirmed, now stored as file records. */
  attestationsConfirmed: number;
  /**
   * Edges a confirmed attestation dropped that its two readers had explained.
   *
   * Recorded as dismissed rather than opened: two actors already read those
   * lines and called them non-references, which is the same bar a dismissal
   * clears, so asking two more would be the ceremony twice.
   */
  attestationDismissals: number;
  /**
   * Judgements discarded because their file left the tree or the facts scope.
   *
   * A report, not a refusal: the removal already happened and nothing is owed
   * for it, but an adopted edge disappearing silently is exactly the kind of
   * quiet narrowing the side table exists to make visible.
   */
  removedAdjudicatedItems: number;
}

/** The evidence behind a submit summary. */
export interface FactsSubmitData {
  rejected: FactsRejection[];
  rejectedTruncated: number;
  /** Paths added since the epoch the caller submitted against. */
  added: FactsFileList;
  /** Paths removed since that epoch. */
  removed: FactsFileList;
  /** Resolution inputs whose contents changed since that epoch. */
  changedResolutionInputs: FactsFileList;
  /** One entry per attested record, with what it did and what is owed. */
  attested: AttestedOutcome[];
}

/** Child payload variants returned by facts actions. */
export type FactsResult =
  | ToolPayload<FactsStatusSummary, FactsStatusData>
  | ToolPayload<FactsSubmitSummary, FactsSubmitData>
  | ToolPayload<FactsAdjudicateSummary, FactsAdjudicateData>
  | ToolPayload<FactsCompareSummary, FactsCompareData>
  | ToolPayload<FactsDiscardPendingSummary, FactsDiscardPendingData>
  | ToolPayload<FactsDiscardDamagedSummary, FactsDiscardDamagedData>;
