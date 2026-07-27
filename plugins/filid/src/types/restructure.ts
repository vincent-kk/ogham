import {
  CONTRACT_INTENTS,
  PLACEMENT_BASES,
  REQUIRED_ARTIFACT_ROLES,
  RESTRUCTURE_DECISION_REASONS,
  RESTRUCTURE_NODE_TYPES,
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
  decisionReasons: RestructureDecisionReason[];
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
  requiresDecision: boolean;
  decisionReasons: RestructureDecisionReason[];
}

export interface RestructurePlan {
  schemaVersion: 1;
  planId: string;
  projectRoot: string;
  snapshotHash: string;
  createdAt: string;
  moves: MoveInstruction[];
  unresolved: MoveInstruction[];
  summary: {
    moveCount: number;
    fractalsCreated: number;
    organsCreated: number;
    decisionsRequired: number;
  };
}

export interface PlanValidationFinding {
  code: RestructureValidationCode;
  message: string;
  path?: string;
  sourcePath?: string;
}

export interface PlanValidationResult {
  valid: boolean;
  findings: PlanValidationFinding[];
}
