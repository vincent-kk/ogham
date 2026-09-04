import type { ToolStatus } from '../../../../types/toolEnvelope.js';
import type {
  ReviewScopeFile,
  WorktreeDisposition,
} from '../state/reviewStateTypes.js';
import type { ReviewVerdictFold } from '../verdict/reviewVerdictTypes.js';

/** Prepared evidence fields repeated in canonical sealed artifacts. */
export interface ReviewRenderEvidence {
  /** Immutable committed-source identity captured by prepare. */
  sourceHash: string;
  /** FCA snapshot identity captured with the changed roster. */
  snapshotHash: string;
  /** Whether both FCA evidence axes completed conclusively. */
  evidenceComplete: boolean;
  /** Structure scan status retained without reinterpretation. */
  structureStatus: ToolStatus;
  /** Verification scan status retained without reinterpretation. */
  verificationStatus: ToolStatus;
  /** Prepare-time working-tree classification. */
  worktree: WorktreeDisposition;
}

/** Shared deterministic input for every seal-time Markdown renderer. */
export interface ReviewRenderInput {
  /** Original reviewed branch name. */
  branchName: string;
  /** Base reference used to prepare the review snapshot. */
  baseRef: string;
  /** Review artifact directory rendered in report pointers. */
  reviewDirectory: string;
  /** Single ISO timestamp shared by every seal output. */
  generatedAt: string;
  /** Prepared evidence identities and statuses. */
  evidence: ReviewRenderEvidence;
  /** Complete changed-file roster including skipped paths. */
  files: readonly ReviewScopeFile[];
  /** Deterministic verdict fold consumed without further judgment. */
  fold: ReviewVerdictFold;
}
