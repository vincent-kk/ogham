import type {
  CONTRACT_INTENTS,
  PLACEMENT_BASES,
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_NODE_TYPES,
  RESTRUCTURE_SCHEMA_VERSION,
  RESTRUCTURE_UNIT_KINDS,
  RESTRUCTURE_VALIDATION_CODES,
} from '../constants/restructure.js';

import type { UnknownFilePartition } from './fractal.js';

type ValueOf<T> = T[keyof T];

export type PlacementBasis = ValueOf<typeof PLACEMENT_BASES>;
export type RequiredArtifactRole = ValueOf<typeof REQUIRED_ARTIFACT_ROLES>;
export type RestructureUnitKind = ValueOf<typeof RESTRUCTURE_UNIT_KINDS>;
export type RestructureNodeType = ValueOf<typeof RESTRUCTURE_NODE_TYPES>;
export type ContractIntent = ValueOf<typeof CONTRACT_INTENTS>;
export type RestructureDecisionReason = ValueOf<
  typeof RESTRUCTURE_DECISION_REASONS
>;
export type RestructureValidationCode = ValueOf<
  typeof RESTRUCTURE_VALIDATION_CODES
>;
/** Decision reasons one request's own evidence raises; the ordering step alone adds `move-order-conflict`. */
export type PlanningDecisionReason = Exclude<
  RestructureDecisionReason,
  typeof RESTRUCTURE_DECISION_REASONS.MOVE_ORDER_CONFLICT
>;

/** One decision reason of an unresolved request, explained for the caller. */
export interface RestructureDecision {
  /** The decision reason code, also listed in `decisionReasons`. */
  reason: RestructureDecisionReason;
  /** What blocks the request and why, naming the paths involved. */
  message: string;
  /** What the caller does next, or who must decide. */
  nextAction: string;
}

/** One import the moves affect; postcondition judges it only by the file the consumer's reference resolves to. */
export interface ImportRequirement {
  /** Consumer file after every move. */
  consumerPath: string;
  /** Specifier the consumer holds before the moves. */
  currentSpecifier: string;
  /** File the import must load after every move. */
  requiredResolvedPath: string;
  /**
   * Proposed path-like specifier, present only when the current specifier names the file
   * or its enclosing directory; never used to validate. Without it the caller writes the specifier.
   */
  suggestedSpecifier?: string;
}

/** Why no execution order can run a move: its cycle group's cause, a self-containing move, or a directory emptied by inner moves. */
export type OrderConflictCause =
  'duplicate' | 'swap' | 'cycle' | 'nested' | 'emptied';

/** A move the ordering step cannot place, with the moves that cause it. */
export interface OrderConflict {
  /** Index of the conflicting move in the ordered input. */
  index: number;
  /** Why the move cannot run. */
  cause: OrderConflictCause;
  /** Indexes of the other moves involved, ascending; empty for `nested`. */
  related: number[];
}

export interface RequiredArtifact {
  role: RequiredArtifactRole;
  path: string;
  adapterId?: string;
}

/** Import requirements one moved unit owns. */
export interface ImportRewriteBuildResult {
  /** Imports that must change to load their required file, with a suggestion when one can be synthesized. */
  required: ImportRequirement[];
  /** Imports without a suggestion whose relative position the moves keep, so they still resolve. */
  preserved: ImportRequirement[];
}

export interface PlacementRequest {
  sourcePath: string;
  consumerPaths?: string[];
  contractIntent?: ContractIntent;
  organNameHint?: string;
}

export interface RestructurePlanInput {
  path: string;
  requests: PlacementRequest[];
}

export interface MoveInstruction {
  sourcePath: string;
  targetPath: string;
  unitKind: RestructureUnitKind;
  targetNodeType: RestructureNodeType;
  basis: PlacementBasis;
  consumerPaths: string[];
  lowestCommonFractalPath?: string;
  reason: string;
  requiredArtifacts: RequiredArtifact[];
  /** Imports the caller changes after every move; empty in `alreadyPlaced` and `unresolved`. */
  affectedImports: ImportRequirement[];
  /** Imports the moves keep resolving; postcondition checks them, the caller does nothing. */
  preservedImports: ImportRequirement[];
  requiresDecision: boolean;
  decisionReasons: RestructureDecisionReason[];
  /** One explanation per entry of `decisionReasons`, in the same order. */
  decisions: RestructureDecision[];
}

/** An executable move of a plan, against which rewrites relocate consumers the same plan moves. */
export type PlannedMove = Pick<MoveInstruction, 'sourcePath' | 'targetPath'>;

/** A move whose import rewrites are being built; consumers of a file unit load `rewriteTargetPath`, its entry point when it becomes an independent fractal. */
export type RewriteUnit = PlannedMove & { rewriteTargetPath: string };

export interface RestructurePlan {
  schemaVersion: typeof RESTRUCTURE_SCHEMA_VERSION;
  planId: string;
  projectRoot: string;
  snapshotHash: string;
  /** Files whose bytes the plan read — move sources, their consumers, what they import, and the unknown files the relevance filter read — sorted. */
  readPaths: string[];
  /** Paths whose state decided placement — each target and the documents of every source and target ancestor — sorted; each may not exist. */
  probePaths: string[];
  /** Hash of the `readPaths` bytes and the `probePaths` states; precondition recomputes it to detect drift that matters to the plan. */
  readHash: string;
  createdAt: string;
  moves: MoveInstruction[];
  alreadyPlaced: MoveInstruction[];
  unresolved: MoveInstruction[];
  /** Unknown files of the plan-time graph; `relevant` ones make the plan indeterminate. */
  unknownFiles: UnknownFilePartition;
  /** Cycles and boundary violations before execution; postcondition reports them as `preexisting`. */
  baseline: PlanBaseline;
  summary: {
    moveCount: number;
    fractalsCreated: number;
    organsCreated: number;
    alreadyPlacedCount: number;
    decisionsRequired: number;
    /** Sum of `affectedImports` over `moves`. */
    affectedImportCount: number;
  };
}

export interface PlanValidationFinding {
  code: RestructureValidationCode;
  message: string;
  /** What the caller fixes before running the validation again. */
  nextAction: string;
  path?: string;
  sourcePath?: string;
}

/** A boundary violation's identity: the rule, the importing file and the file it loads. */
export interface PlanBaselineViolation {
  /** Rule that reported the violation, e.g. `external-import-boundary`. */
  ruleId: string;
  /** Absolute path of the file holding the import. */
  consumerPath: string;
  /** Absolute path of the file the import loads. */
  importedPath: string;
}

/** What the plan-time snapshot already violated, compared after execution. */
export interface PlanBaseline {
  /** Cycle routes of the plan-time graph, each closed by its first owner. */
  cycles: string[][];
  /**
   * Identity of each import-boundary violation the plan-time snapshot held; a
   * postcondition violation matching one after relocation through the moves is
   * `preexisting`, and one without an identity is always a finding.
   */
  boundaryViolations: PlanBaselineViolation[];
}

export interface PlanValidationResult {
  /** True when `findings` is empty; `preexisting` alone never fails. */
  valid: boolean;
  findings: PlanValidationFinding[];
  /** Cycles and boundary violations the plan-time baseline already held, as full records. Always empty for precondition. */
  preexisting: PlanValidationFinding[];
  /** Unknown files of the checked snapshot, split by relevance to the plan's units. */
  unknownFiles: UnknownFilePartition;
}
