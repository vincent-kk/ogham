/** Completion state asserted by a reviewer opinion. */
export type ReviewOpinionState = 'COMPLETE' | 'INDETERMINATE';

/** Severity carried by one reviewer finding. */
export type ReviewFindingSeverity = 'error' | 'warning';

/** Contract category carried by one reviewer finding. */
export type ReviewFindingCategory =
  | 'bug'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'test'
  | 'documentation'
  | 'contract'
  | 'structure'
  | 'verification';

/** Reviewer coverage result for one assigned unit. */
export type ReviewFileResult = 'reviewed' | 'skipped';

/** Reviewer coverage record for one assigned review unit. */
export interface ReviewOpinionFile {
  /** Project-relative path of the assigned unit. */
  path: string;
  /** Git change class for the assigned unit. */
  change: 'A' | 'M' | 'D';
  /** One-based `index/total` chunk identity, or null for an unchunked path. */
  chunk: string | null;
  /** Whether the reviewer could inspect the unit diff. */
  result: ReviewFileResult;
  /** Evidence gap when the unit was skipped, otherwise null. */
  reason: string | null;
}

/** One falsifiable defect claim produced by a reviewer. */
export interface ReviewFinding {
  /** Group-scoped reviewer finding identifier. */
  id: string;
  /** Impact level of the claimed defect. */
  severity: ReviewFindingSeverity;
  /** Contract category of the claimed defect. */
  category: ReviewFindingCategory;
  /** Project-relative path containing the claimed defect. */
  path: string;
  /** Exact existing source excerpt supporting independent location. */
  existingCode: string;
  /** Validated inclusive line range or `unknown`. */
  lines: string;
  /** Whether the validated line range overlaps the assigned unit diff. */
  inDiff: boolean;
  /** Stable review rule identifier supporting the claim. */
  rule: string;
  /** Falsifiable statement of the claimed defect. */
  message: string;
  /** Concrete repository evidence for the claim. */
  evidence: string;
  /** Observable failure caused by leaving the defect unchanged. */
  consequence: string;
  /** Bounded correction recommended to the caller. */
  recommendedAction: string;
}

/** Evidence the reviewer could not obtain for one path and rule. */
export interface ReviewOpinionGap {
  /** Project-relative path whose evidence is incomplete. */
  path: string;
  /** Stable review rule identifier affected by the gap. */
  rule: string;
  /** Concrete evidence that could not be obtained. */
  detail: string;
}

/** Validated reviewer opinion for one group and round. */
export interface ReviewOpinion {
  /** Opinion artifact schema version. */
  schema: 7;
  /** At-least-two-digit review group identifier. */
  group: string;
  /** One-based review round represented by the artifact. */
  round: number;
  /** Whether the reviewer completed all requested evidence checks. */
  state: ReviewOpinionState;
  /** Immutable committed-source identity copied from review state. */
  sourceHash: string;
  /** Coverage result for every unit assigned to the group. */
  files: ReviewOpinionFile[];
  /** Falsifiable defect claims found through this round. */
  findings: ReviewFinding[];
  /** Stable paths and candidate identifiers checked by the reviewer. */
  checked: string[];
  /** Evidence gaps that prevent a complete review opinion. */
  gaps: ReviewOpinionGap[];
  /** Reviewer risk plan required for high-churn groups, when present. */
  riskPlan: string | null;
}
