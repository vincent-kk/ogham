/**
 * @file report.ts
 * @description filid v2 분석 보고서 타입 정의.
 *
 * project-analyzer는 scan → validate → drift 파이프라인을 실행하고
 * AnalysisReport를 생성한다.
 */
import type { STRUCTURE_VALIDATION_MODES } from '../constants/mcpContracts.js';

import type { ContextResolution } from './context.js';
import type {
  AnalysisCertainty,
  FractalTree,
  FractalTreeDto,
  ModuleInfo,
  NodeType,
  ProjectSnapshot,
} from './fractal.js';
import type { PlanValidationResult, RestructurePlan } from './restructure.js';
import type { RuleEvaluationResult } from './rules.js';
import type { RuleScope } from './rules.js';
import type { ScanOptions } from './scan.js';
import type { VerificationProjectAnalysis } from './verification.js';

export type ProjectSnapshotDto = Omit<ProjectSnapshot, 'tree'> & {
  tree: FractalTreeDto;
};

export interface FractalScanSummary {
  projectRoot: string;
  snapshotHash: string;
  adapterIds: string[];
  totalNodes: number;
  depth: number;
  nodesByType: Partial<Record<NodeType, number>>;
  violationCount: number;
  certainty: AnalysisCertainty;
  /**
   * Diagnostics dropped because they concern nodes the name filter excluded.
   * Absent when no filter narrowed the query.
   */
  diagnosticsOutOfScope?: number;
}

export interface FractalScanPathEntry {
  path: string;
  type: NodeType;
  hasIntentMd: boolean;
  hasDetailMd: boolean;
  entryPointCount: number;
  /**
   * Names this node's entry points export, deduplicated. Absent when no
   * adapter inspected the surface — an empty array means inspected and empty.
   */
  exportedNames?: string[];
}

export interface FractalScanPathsData {
  nodes: FractalScanPathEntry[];
}

export interface FractalScanFullData {
  snapshot: ProjectSnapshotDto;
  validation: ValidationReport;
}

export type FractalScanData = FractalScanPathsData | FractalScanFullData;

export interface ContextResolveSummary {
  projectRoot: string;
  targetPath: string;
  ownerFractalPath: string;
  chainLength: number;
  /**
   * Owner-to-root fractal paths. Carried in the summary because an overflowing
   * payload moves `data` to an artifact while the summary stays inline.
   */
  chainPaths: string[];
  nearestDetailPath: string | null;
  outputLanguage: string;
  /**
   * Snapshot diagnostics dropped because their path sits outside the resolved
   * chain. Zero when every diagnostic was in scope.
   */
  diagnosticsOutOfScope: number;
  /**
   * Lowest fractal owning every `comparePaths` entry, or `null` when no common
   * owner could be settled. Absent when the caller requested no comparison.
   */
  lowestCommonFractalPath?: string | null;
}

export type ContextResolveData = ContextResolution;

export interface RestructurePlanSummary {
  projectRoot: string;
  planId: string;
  snapshotHash: string;
  moveCount: number;
  fractalsCreated: number;
  organsCreated: number;
  decisionsRequired: number;
}

export type RestructurePlanData = RestructurePlan;

export interface VerificationRoleSummary {
  fileCount: number;
  knownCaseCount: number;
  caseCap: number;
}

export interface VerificationScanSummary {
  projectRoot: string;
  snapshotHash: string;
  fileCount: number;
  specDocument: VerificationRoleSummary;
  testRecord: VerificationRoleSummary;
  fragmentationCount: number;
  violationCount: number;
  certainty: AnalysisCertainty;
}

export type VerificationScanData = VerificationProjectAnalysis;

export interface StructureValidateSummary {
  projectRoot: string;
  snapshotHash: string;
  mode: (typeof STRUCTURE_VALIDATION_MODES)[keyof typeof STRUCTURE_VALIDATION_MODES];
  scopes: RuleScope[];
  findingCount: number;
  passed: number;
  failed: number;
  skipped: number;
}

export type StructureValidateData = ValidationReport | PlanValidationResult;

/** In-process scan result. `tree.nodes` is a `Map`. Use {@link ScanReportDto} for MCP responses. */
export interface ScanReport {
  tree: FractalTree;
  modules: ModuleInfo[];
  timestamp: string;
  duration: number;
}

/**
 * MCP-response shape for `fractal_scan`.
 *
 * Differs from {@link ScanReport} in that `tree` is a {@link FractalTreeDto} with
 * a flat `nodes: FractalNode[]` array instead of a `Map`. This eliminates the
 * Map+Array double-serialization that was inflating responses by ~50%.
 */
export interface ScanReportDto {
  tree: FractalTreeDto;
  modules: ModuleInfo[];
  timestamp: string;
  duration: number;
}

/** Compact `fractal_scan` result — always context-safe. */
export interface ScanSummaryDto {
  outputMode: 'summary';
  root: string;
  depth: number;
  totalNodes: number;
  nodesByType: Record<string, number>;
  /** fractal-classified nodes lacking INTENT.md */
  missingIntentFractals: number;
  timestamp: string;
  duration: number;
}

/** Path-projection `fractal_scan` result (structure without payload bulk). */
export interface ScanPathsDto {
  outputMode: 'paths';
  root: string;
  totalNodes: number;
  nodes: Array<{
    path: string;
    type: string;
    hasIntentMd: boolean;
    hasDetailMd: boolean;
  }>;
  timestamp: string;
  duration: number;
}

/** Oversized-result degradation: payload saved to a file, summary inline. */
export interface ScanTruncatedDto {
  outputMode: 'full' | 'summary' | 'paths';
  truncated: true;
  /** Absolute path of the line-structured JSON report (Read/grep it). */
  reportPath: string;
  summary: Omit<ScanSummaryDto, 'outputMode'>;
}

export type ScanResultDto =
  ScanReportDto | ScanSummaryDto | ScanPathsDto | ScanTruncatedDto;

export interface ValidationReport {
  result: RuleEvaluationResult;
  scanOptions?: ScanOptions;
  timestamp: string;
}
