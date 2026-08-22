/** One parsed gate and its source-line coordinates in a task ledger. */
export interface GateEntry {
  /** Ledger-global identifier such as `G3`. */
  id: string;
  /** Human-readable outcome text following the checkbox and identifier. */
  title: string;
  /** Whether the ledger checkbox is currently selected. */
  checked: boolean;
  /** Exact runnable command, absent for a manual gate. */
  check?: string;
  /** Expected output substring or slash-delimited regular expression. */
  expect?: string;
  /** Current proof excerpt or pending marker. */
  evidence: string;
  /** Nearest preceding level-two heading, or an empty string. */
  group: string;
  /** Zero-based source line holding the gate checkbox. */
  line: number;
  /** Zero-based source line holding EVIDENCE when one exists. */
  evidenceLine?: number;
  /** Last recognized field line used as an insertion anchor. */
  lastFieldLine: number;
}

/** One explicit abandonment declaration in a task ledger. */
export interface AbandonEntry {
  /** Gate identifier being abandoned. */
  id: string;
  /** Human explanation for the scope reduction. */
  reason: string;
  /** Zero-based source line holding the declaration. */
  line: number;
}

/** Parsed task-ledger content plus its exact source lines. */
export interface GatesLedger {
  /** Uninterpreted value from the optional `Plan:` header. */
  planRef?: string;
  /** Gates in source order. */
  gates: GateEntry[];
  /** Abandonment declarations in source order. */
  abandons: AbandonEntry[];
  /** Exact source lines used for line-level rewriting. */
  lines: string[];
}

/** Resolved state of one gate. */
export type GateState = 'met' | 'unmet' | 'abandoned';

/** Status projection for one parsed gate. */
export interface GateStatus {
  /** Gate identifier. */
  id: string;
  /** Human-readable gate outcome. */
  title: string;
  /** Heading group that contains the gate. */
  group: string;
  /** State derived from abandonment, checkbox, and evidence. */
  state: GateState;
  /** Runnable command when the gate is executable. */
  check?: string;
  /** Expected output matcher when one is declared. */
  expect?: string;
  /** Current proof excerpt or pending marker. */
  evidence: string;
  /** Whether current met evidence ends with an agent marker. */
  byAgent: boolean;
}

/** Aggregated status for one task ledger. */
export interface TaskLedgerStatus {
  /** Owning task name. */
  task: string;
  /** Absolute ledger path. */
  path: string;
  /** Total parsed gate count. */
  total: number;
  /** Number of proven gates. */
  met: number;
  /** Number of unresolved gates. */
  unmet: number;
  /** Number of explicitly abandoned gates. */
  abandoned: number;
  /** Whether no unresolved gate remains. */
  all_met: boolean;
  /** First unresolved gate identifier in source order. */
  next?: string;
  /** Compact unresolved-gate descriptions. */
  unmet_gates: Array<{
    /** Unresolved gate identifier. */
    id: string;
    /** Human-readable unresolved outcome. */
    title: string;
    /** Runnable command when present. */
    check?: string;
  }>;
  /** Visible abandonment declarations and reasons. */
  abandons: Array<{
    /** Abandoned gate identifier. */
    id: string;
    /** Recorded abandonment reason. */
    reason: string;
  }>;
  /** Met gate identifiers whose current proof came from an agent. */
  met_by_agent: string[];
  /** Per-gate details included only for task-specific status requests. */
  gates?: GateStatus[];
}

/** A task directory and its parsed ledger. */
export interface TaskLedger {
  /** Valid task directory name. */
  task: string;
  /** Absolute task directory path. */
  dir: string;
  /** Absolute ledger file path. */
  path: string;
  /** Parsed ledger content. */
  ledger: GatesLedger;
}

/** Observable result of one CHECK command invocation. */
export type CheckOutcome =
  | {
      /** Successful tool-result discriminator. */
      kind: 'success';
      /** Captured standard output. */
      stdout: string;
      /** Captured standard error. */
      stderr: string;
    }
  | {
      /** Failed tool-result discriminator. */
      kind: 'failure';
      /** Harness-provided error text containing exit and stderr details. */
      error: string;
      /** Process exit code when the harness reports one. */
      exit: number | undefined;
    };

/** Verdict obtained by comparing one gate with one observable outcome. */
export type GateVerdict =
  | {
      /** Proof was observed. */
      kind: 'met';
      /** Output channel that carried the proof. */
      channel: 'output' | 'stderr';
      /** Designed non-zero exit carried directly for stderr rendering. */
      exit?: number;
    }
  | {
      /** Observable output did not prove the gate. */
      kind: 'unmet';
      /** Concise mismatch or exit explanation. */
      reason: string;
      /** Whether this execution revoked previously proven evidence. */
      regressed: boolean;
    }
  | {
      /** Required stdout was hidden by a non-zero tool result. */
      kind: 'unobservable';
    };

/** One gate verdict paired with its task and post-write status. */
export interface RecordedVerdict {
  /** Owning task name. */
  task: string;
  /** Gate judged against the command outcome. */
  gate: GateEntry;
  /** Observation-derived verdict. */
  verdict: GateVerdict;
  /** Task status after any resulting ledger write. */
  status: TaskLedgerStatus;
}
