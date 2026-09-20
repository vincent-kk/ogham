import type {
  AnalysisCertainty,
  VerificationAdapter,
  VerificationCaseCount,
  VerificationRole,
} from './adapters.js';

export interface VerificationFileAnalysis {
  path: string;
  adapterId: string;
  role: VerificationRole;
  count: VerificationCaseCount;
  ownerFractalPath: string;
  /**
   * DETAIL acceptance groups the file's record reports it declares.
   *
   * Absent when the record carries no such list — "the record does not say",
   * which the spec-link rule keeps as indeterminate rather than reading as a
   * file that declares nothing.
   */
  contractGroupIds?: string[];
}

export type VerificationRuleId =
  | 'spec-document-case-cap'
  | 'test-record-case-cap'
  | 'spec-fragmentation'
  | 'spec-contract-link';

export interface VerificationViolation {
  ruleId: VerificationRuleId;
  path: string;
  severity: 'error' | 'warning';
  message: string;
  /** What to do about the violation: the fix, or who must decide. */
  suggestion: string;
  /** Evidence certainty inherited from the analyzed case count. */
  certainty?: AnalysisCertainty;
}

export interface VerificationProjectAnalysis {
  files: VerificationFileAnalysis[];
  violations: VerificationViolation[];
  certainty: AnalysisCertainty;
}

export interface DetailContractDocument {
  ownerFractalPath: string;
  path: string;
  content: string;
}

export type ContractGroupsByOwner = ReadonlyMap<string, ReadonlySet<string>>;

/** What one file's facts record says about its verification role and cases. */
export interface VerificationFileFacts {
  /** The role the record reports; `unsupported` leaves the file unjudged. */
  role: VerificationRole | 'unsupported';
  /** The case count the record reports, in the adapter's own shape. */
  cases: VerificationCaseCount;
  /** The `filid:contract` group ids the record reports, when it reports any. */
  contractGroupIds?: string[];
}

export interface AnalyzeVerificationInput {
  projectRoot: string;
  adapters: readonly VerificationAdapter[];
  ownerFractalPath(filePath: string): string;
  detailDocuments?: readonly DetailContractDocument[];
  discoveredPathsByAdapter?: ReadonlyMap<string, readonly string[]>;
  discoveryCertainty?: AnalysisCertainty;
  /**
   * Role and case count per discovered file, keyed by `pathForCompare`.
   *
   * Required rather than optional: an absent entry means no record could be
   * read for that file, and falling back to the adapter there would hide a
   * missing bootstrap instead of reporting it (spec §11-7).
   */
  verificationFacts: ReadonlyMap<string, VerificationFileFacts>;
}
