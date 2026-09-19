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

/** An import filid cannot rewrite; the caller writes the specifier and postcondition checks where it resolves. */
export interface DelegatedImport {
  /** Consumer file after every move. */
  consumerPath: string;
  /** Specifier the consumer holds before the moves. */
  currentSpecifier: string;
  /** File the rewritten import must load after every move. */
  requiredResolvedPath: string;
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

export interface ImportRewrite {
  consumerPath: string;
  currentSpecifier: string;
  requiredSpecifier: string;
}

export interface ImportRewriteBuildResult {
  rewrites: ImportRewrite[];
  /** Imports the caller rewrites because no path-like specifier denotes their file. */
  delegated: DelegatedImport[];
  /** Imports filid cannot rewrite whose relative position the moves keep, so they still resolve. */
  preserved: DelegatedImport[];
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
  affectedImports: ImportRewrite[];
  /** Imports the caller rewrites itself; empty in `alreadyPlaced` and `unresolved`. */
  delegatedImports: DelegatedImport[];
  /** Unrewritable imports the moves keep resolving; postcondition checks them, the caller does nothing. */
  preservedImports: DelegatedImport[];
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
  createdAt: string;
  moves: MoveInstruction[];
  alreadyPlaced: MoveInstruction[];
  unresolved: MoveInstruction[];
  summary: {
    moveCount: number;
    fractalsCreated: number;
    organsCreated: number;
    alreadyPlacedCount: number;
    decisionsRequired: number;
    /** Sum of `delegatedImports` over `moves`. */
    delegatedImportCount: number;
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

export interface PlanValidationResult {
  valid: boolean;
  findings: PlanValidationFinding[];
}
