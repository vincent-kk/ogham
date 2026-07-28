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
  contractGroupIds: string[];
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

export interface AnalyzeVerificationInput {
  projectRoot: string;
  adapters: readonly VerificationAdapter[];
  ownerFractalPath(filePath: string): string;
  detailDocuments?: readonly DetailContractDocument[];
  discoveredPathsByAdapter?: ReadonlyMap<string, readonly string[]>;
  discoveryCertainty?: AnalysisCertainty;
}
