import type { FACTS_ACTIONS, FACTS_PROJECT_STATES } from '../../../../constants/facts.js';
import type { FactsRejection } from '../../../../core/facts/index.js';
import type { ToolPayload } from '../../../../types/toolEnvelope.js';

/** Action-discriminated input accepted by the public facts tool. */
export type FactsInput =
  | { action: typeof FACTS_ACTIONS.STATUS; path: string }
  | {
      action: typeof FACTS_ACTIONS.SUBMIT;
      path: string;
      file: string;
      resolutionEpoch: string;
    };

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
  /**
   * Where extraction output must go, stated as a requirement.
   *
   * Not a server-side path: the server's temp directory is not writable by the
   * sandboxed agent, so the caller picks a directory meeting this requirement
   * and the submission guard judges that path.
   */
  outputRequirement: string;
}

/** The per-file lists behind a status summary. */
export interface FactsStatusData {
  missing: FactsFileList;
  needsResolution: FactsFileList;
  uncertain: FactsFileList;
  toolError: FactsFileList;
  rejected: FactsFileList;
  /** Adjudication items; always empty until the side table exists. */
  unadjudicated: FactsFileList;
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
}

/** Child payload variants returned by facts actions. */
export type FactsResult =
  | ToolPayload<FactsStatusSummary, FactsStatusData>
  | ToolPayload<FactsSubmitSummary, FactsSubmitData>;
