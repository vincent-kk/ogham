import type { RenderedReviewUnit } from '../diff/reviewUnitDiffTypes.js';
import type { ReviewFinding } from '../opinion/reviewOpinionTypes.js';
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
  /** Verbatim canonical reviewer method loaded at the effect boundary. */
  reviewerMethod: string;
  /** Bounded untrusted change summary prepared from caller text or Git. */
  changeContext: string;
  /** Materialized group diffs, or null when their combined bytes exceed the budget. */
  diffs: readonly RenderedReviewUnit[] | null;
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
  /** Bounded untrusted change summary supplied by prepare. */
  changeContext: string;
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

/** Explicit inputs needed to render one verifier handoff brief. */
export interface RenderVerifyBriefInput {
  /** Canonical verifier method whose Deliverable section begins normal review. */
  verifierMethod: string;
  /** Materialized group diffs, or null when their combined bytes exceed the budget. */
  diffs: readonly RenderedReviewUnit[] | null;
  /** Group whose assigned reviewer findings require decisions. */
  group: ReviewGroup;
  /** Full roster used to enrich the group's file rows. */
  files: readonly ReviewScopeFile[];
  /** Located reviewer findings requiring verification. */
  findings: readonly ReviewFinding[];
  /** Immutable committed-source identity. */
  sourceHash: string;
}
