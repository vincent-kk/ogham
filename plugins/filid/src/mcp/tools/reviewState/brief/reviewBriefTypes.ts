import type { ReviewGroup } from '../state/reviewGroupTypes.js';
import type {
  ReviewScopeCandidate,
  ReviewScopeFile,
} from '../state/reviewStateTypes.js';

/** Resolved rule body embedded into a reviewer brief. */
export interface ReviewRuleBody {
  /** Stable rule identifier recorded on findings. */
  id: string;
  /** Markdown instructions loaded from the trusted rule file. */
  body: string;
}

/** Explicit inputs needed to render one deterministic reviewer brief. */
export interface RenderReviewBriefInput {
  /** Group whose units and dependencies the reviewer receives. */
  group: ReviewGroup;
  /** Full prepared roster used to enrich group-unit rows. */
  files: readonly ReviewScopeFile[];
  /** FCA candidates assigned to this group. */
  candidates: readonly ReviewScopeCandidate[];
  /** Ordered, deduplicated repository instruction paths. */
  repositoryRules: readonly string[];
  /** Ordered built-in and repository-override bodies selected for the group. */
  rules: readonly ReviewRuleBody[];
  /** Immutable committed-source identity. */
  sourceHash: string;
  /** User-supplied base reference recorded for reviewer context. */
  baseRef: string;
}

/** Explicit inputs needed to render the cross-review orchestration session. */
export interface RenderSessionMarkdownInput {
  /** Source branch under review. */
  branchName: string;
  /** Base reference used for the committed diff. */
  baseRef: string;
  /** Immutable committed-source identity. */
  sourceHash: string;
  /** Canonical directory containing every review artifact. */
  reviewDirectory: string;
  /** Effective reviewer effort. */
  effort: 'low' | 'medium' | 'high';
  /** ISO timestamp shared with the persisted prepared state. */
  createdAt: string;
  /** Full changed-file roster, including skipped paths. */
  files: readonly ReviewScopeFile[];
  /** Deterministic reviewer groups used to annotate roster rows. */
  groups: readonly ReviewGroup[];
}

/** Located reviewer finding rendered as a verifier decision target. */
export interface VerifyBriefFinding {
  /** Stable reviewer finding identifier. */
  id: string;
  /** Review category selected by the reviewer. */
  category: string;
  /** Review severity selected by the reviewer. */
  severity: string;
  /** Project-relative finding path. */
  path: string;
  /** Resolved inclusive line range or `unknown`. */
  lines: string;
  /** Whether the resolved range intersects this group's diff. */
  inDiff: boolean;
  /** Rule identifier supporting the finding. */
  rule: string;
  /** Falsifiable defect statement. */
  message: string;
  /** Concrete evidence locator. */
  evidence: string;
  /** Consequence if the finding remains. */
  consequence: string;
  /** Exact existing code used for independent location. */
  existingCode: string;
}

/** Explicit inputs needed to render one verifier handoff brief. */
export interface RenderVerifyBriefInput {
  /** Group whose review and FCA claims require decisions. */
  group: ReviewGroup;
  /** Full roster used to enrich the group's file rows. */
  files: readonly ReviewScopeFile[];
  /** Located reviewer findings requiring verification. */
  findings: readonly VerifyBriefFinding[];
  /** FCA candidates assigned to the group. */
  candidates: readonly ReviewScopeCandidate[];
  /** Immutable committed-source identity. */
  sourceHash: string;
}
