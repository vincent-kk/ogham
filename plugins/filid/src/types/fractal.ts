/**
 * @file fractal.ts
 * @description 프랙탈 구조 트리의 핵심 데이터 모델 정의.
 *
 * FractalTree는 프로젝트 디렉토리를 계층적 노드 그래프로 표현하며,
 * 각 노드(FractalNode)는 자신의 분류 타입(CategoryType)과 부모/자식 관계를 보유한다.
 */
import type { ANALYSIS_AXES } from '../constants/analysisAxes.js';
import type { ANALYSIS_CERTAINTIES } from '../constants/analysisCertainties.js';
import type { FACTS_FILE_STATES } from '../constants/facts.js';

import type { DependencyReferenceKind } from './adapters.js';
import type { BoundaryExemptionDeclaration } from './documents.js';
import type { VerificationProjectAnalysis } from './verification.js';

export type AnalysisCertainty =
  (typeof ANALYSIS_CERTAINTIES)[keyof typeof ANALYSIS_CERTAINTIES];

/**
 * 디렉토리의 프랙탈 분류 타입.
 *
 * - `fractal`: 하위 프랙탈 노드를 포함하는 복합 단위. 자체 index.ts를 가질 수 있다.
 * - `organ`: 특정 역할에 특화된 단말 디렉토리 (e.g., `hooks/`, `utils/`, `types/`).
 *            INTENT.md를 포함하지 않는다.
 * - `pure-function`: 단일 책임 함수/유틸리티 모음. 외부 의존이 없어야 한다.
 * - `hybrid`: fractal과 organ의 특성을 모두 갖는 과도기적 형태. 리팩토링 대상.
 */
export type NodeType = 'fractal' | 'organ' | 'pure-function' | 'hybrid';
export type CategoryType = NodeType;

export interface EntryPointDescriptor {
  path: string;
  kind: 'module' | 'executable' | 'framework' | 'manifest';
  adapterId: string;
  surface: 'enumerated' | 'opaque' | 'unsupported';
}

export interface EntryPointSurfaceEvidence {
  entryPoint: EntryPointDescriptor;
  exportedNames: string[];
  hasDirectDeclarations: boolean;
  certainty: AnalysisCertainty;
}

export interface DocumentContractFinding {
  document: 'intent' | 'detail';
  rule: string;
  /** `## ` section title the finding sits in; '' names the preamble. Set by section-scoped rules. */
  section?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface FractalDocumentEvidence {
  intentPath: string | null;
  detailPath: string | null;
  intentLines?: number;
  status: 'valid' | 'violations' | 'missing';
  findings: DocumentContractFinding[];
  /**
   * Boundary exemptions this fractal's DETAIL.md declares, with each
   * `targetPath` normalized to an absolute path against the owning fractal.
   * Absent unless the document carries a `## Boundary Exemptions` section.
   */
  boundaryExemptions?: BoundaryExemptionDeclaration[];
}

/** Fractal node — a domain boundary with independent business logic */
export interface FractalNode {
  /** Absolute directory path */
  path: string;
  /** Node name (directory name) */
  name: string;
  /** Node classification */
  type: CategoryType;
  /** Parent fractal path (null if root) */
  parent: string | null;
  /** Closest owning parent fractal path (null if root) */
  parentFractalPath: string | null;
  /** Child fractal paths */
  children: string[];
  /** Child fractal paths */
  childFractalPaths: string[];
  /** Organ directory paths */
  organs: string[];
  /** Organ paths owned by this fractal */
  organPaths: string[];
  /** Whether INTENT.md exists */
  hasIntentMd: boolean;
  /** Whether DETAIL.md exists */
  hasDetailMd: boolean;
  /** Adapter-reported public entry points */
  entryPoints: EntryPointDescriptor[];
  /** Snapshot-time inspections of each public entry point. */
  entryPointSurfaces?: EntryPointSurfaceEvidence[];
  /** Snapshot-time document paths and contract findings. */
  documentEvidence?: FractalDocumentEvidence;
  /** Immediate peer files */
  peerFiles: string[];
  /** @deprecated Transitional compatibility field; use entryPoints. */
  /** Whether index.ts or index.js exists in this directory */
  hasIndex: boolean;
  /** @deprecated Transitional compatibility field; use entryPoints. */
  /** Whether main.ts or main.js exists in this directory */
  hasMain: boolean;
  /** Depth from root (root = 0) */
  depth: number;
  /** Extended metadata (file counts, etc.) */
  metadata: Record<string, unknown>;
}

/** Fractal tree — the complete hierarchy */
export interface FractalTree {
  /** Root node path */
  root: string;
  /** Path → node mapping */
  nodes: Map<string, FractalNode>;
  /** Maximum depth of the tree (root = 0) */
  depth: number;
  /** Total node count (including root) */
  totalNodes: number;
}

/**
 * MCP-response-only flat tree shape.
 *
 * `FractalTree.nodes` is a `Map` in process; serializing the Map directly
 * inflated MCP responses. MCP handlers convert to this DTO so
 * clients see one `nodes: FractalNode[]` array — smaller payloads and a single,
 * unambiguous iteration path for LLMs.
 */
export interface FractalTreeDto {
  root: string;
  depth: number;
  totalNodes: number;
  nodes: FractalNode[];
}

/** Dependency edge */
export interface DependencyEdge {
  /** Source module path */
  from: string;
  /** Target module path */
  to: string;
  /** Dependency type */
  type: 'import' | 'export' | 'call' | 'inheritance';
}

/** Directed Acyclic Graph (DAG) */
export interface DependencyDAG {
  /** Set of node (module path) identifiers */
  nodes: Set<string>;
  /** Edge array */
  edges: DependencyEdge[];
  /** Adjacency list (from → to[]) */
  adjacency: Map<string, string[]>;
}

export interface DependencyEvidence {
  sourceFile: string;
  rawSpecifier: string;
  resolvedPath: string;
}

export interface DependencyGraphEdge {
  fromFractalPath: string;
  toFractalPath: string;
  evidence: DependencyEvidence[];
}

/**
 * A file whose references the analysis could not confirm, with the diagnostic
 * codes that explain why. Conclusions that need an absence (no cycle, no
 * boundary violation) hold only where no related file is listed.
 */
export interface UnknownFile {
  /** Project-relative POSIX path. */
  path: string;
  /** Sorted, unique diagnostic codes attributed to the file. */
  causes: string[];
}

/** Unknown files split by whether they bear on the units under judgement. */
export interface UnknownFilePartition {
  /** Files that block a conclusion about those units. */
  relevant: UnknownFile[];
  /** Files reported as information only. */
  other: UnknownFile[];
}

export interface DependencyGraph {
  nodePaths: string[];
  edges: DependencyGraphEdge[];
  cycles: string[][];
  /** Files whose references are unconfirmed, sorted by path. */
  unknownFiles: UnknownFile[];
  /** Display value derived from `unknownFiles`; `unsupported` when no adapter read the project. */
  certainty: AnalysisCertainty;
}

/** An analysis axis whose conclusions a diagnostic can change. */
export type AnalysisAxis = (typeof ANALYSIS_AXES)[number];

export interface SnapshotDiagnostic {
  code: string;
  message: string;
  path?: string;
  /** Axes whose conclusions this diagnostic can change; `[]` means none. */
  affects: readonly AnalysisAxis[];
  causeId?: string;
  specifier?: string;
  /** What the caller does next; carried into the tool diagnostic unchanged. */
  nextAction: string;
}

/** One adjudicated item whose edge a file's valid references include (spec §4.5). */
export interface NormalizedAdjudication {
  /** `sourceText ?? specifier`, exactly as the side-table item names it. */
  reference: string;
  /** Project-relative path the adopted edge points at. */
  resolvedPath: string;
  /** Digest of the judged lines, so a freeze records what it applied. */
  lineDigest: string;
}

/** One reference, reduced to what a conclusion can rest on. */
export interface NormalizedReference {
  /** `sourceText ?? specifier`, as the record spells it. */
  reference: string;
  /** Reference kind, as the provider reported it. */
  kind: DependencyReferenceKind;
  /** Project-relative path it resolves to; only in-project edges are kept. */
  resolvedPath: string;
}

/**
 * One file's valid references, normalized so a review can freeze them (spec §9).
 *
 * Valid means the record's references plus the adopted ones, which is what the
 * rules run on; only in-project resolutions are kept, because an `external` or
 * `unresolved` spelling difference carries no edge and would otherwise
 * invalidate a whole review for nothing.
 */
export interface NormalizedFileFacts {
  /** Project-relative POSIX path of the file these facts describe. */
  path: string;
  /**
   * The file's facts state when the review froze it.
   *
   * An empty `references` means two different things — the store read the file
   * and found no edge (`exact`), or no provider could read it at all
   * (`tool-error`, which the prepare gate lets through). A comparison that
   * cannot tell them apart demands an edge from a file nothing can extract,
   * and nothing the caller does clears that (P5).
   *
   * Derived from the same constant as core's `FactsFileState`; the types are
   * the same set, named twice because this one may not depend on core.
   */
  state: (typeof FACTS_FILE_STATES)[keyof typeof FACTS_FILE_STATES];
  /** Its in-project edges, sorted, so two runs digest the same bytes. */
  references: NormalizedReference[];
  /** The judgements among them, empty when none applied. */
  adjudications: NormalizedAdjudication[];
}

export interface LegacyCriteriaLedgerEvidence {
  path: string;
  targetDetailPath: string;
}

/**
 * Which evidence axes a snapshot was asked to collect. Tree and document
 * evidence are not axes — the others only mean anything on top of them.
 */
export interface SnapshotAxisSelection {
  /** Entry-point export surfaces on each node. */
  entrySurfaces: boolean;
  /** Dependency references and the owner-level DAG. */
  dependencies: boolean;
  /** spec-document and test-record analysis. */
  verification: boolean;
}

export interface ProjectSnapshot {
  schemaVersion: 1;
  projectRoot: string;
  outputLanguage: string;
  snapshotHash: string;
  tree: FractalTree;
  dependencyGraph: DependencyGraph;
  adapterIds: string[];
  verification: VerificationProjectAnalysis;
  legacyCriteriaLedger: LegacyCriteriaLedgerEvidence | null;
  diagnostics: SnapshotDiagnostic[];
  /**
   * The valid references behind this snapshot, one entry per `exact` file.
   *
   * Carried so a review can freeze what it judged (spec §9) without reading
   * the store a second time, which could answer differently. Empty when the
   * dependency axis was not collected.
   */
  normalizedFacts: NormalizedFileFacts[];
  /**
   * Source files the declared facts scope drops.
   *
   * An absence proved over files nobody looked at is not the same claim as one
   * proved over all of them, and only this number tells the two apart. It
   * changes no conclusion, so it is not a diagnostic and not a hash input.
   *
   * Counted as what the built-in default scope (the adapters' source
   * extensions) would have covered minus what `facts.covers`/`facts.excludes`
   * leaves in scope — a document or a manifest was never a candidate for a
   * reference fact, and counting it would put a non-zero "unread" number on
   * every project that declares nothing. Zero when the declared scope drops no
   * source file. Declared limit: a language outside the default extensions
   * enters the scope only through `facts.covers`, so a file of that language
   * the project never declared does not count as dropped.
   */
  filesOutsideFactsScope: number;
  /**
   * What this snapshot actually collected. An axis reported false carries an
   * empty value with `unsupported` certainty — read this before trusting an
   * empty graph or verification result as evidence of absence.
   */
  collectedAxes: SnapshotAxisSelection;
  createdAt: string;
}

/** 디렉토리 항목 정보. 스캔 과정에서 내부적으로 사용한다. */
export interface DirEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

/** 개별 모듈의 정적 분석 정보. */
export interface ModuleInfo {
  path: string;
  name: string;
  entryPoint: string | null;
  exports: string[];
  imports: string[];
  dependencies: string[];
}

/**
 * export 항목 하나의 정보. index-analyzer 내부에서 사용한다.
 * AST의 ExportInfo와 구분하기 위해 ModuleExportInfo로 명명.
 */
export interface ModuleExportInfo {
  name: string;
  kind: 'named' | 'default' | 'type' | 're-export';
  source?: string;
}

/** index.ts의 barrel 패턴 분석 결과. */
export interface BarrelPattern {
  isPureBarrel: boolean;
  reExportCount: number;
  declarationCount: number;
  missingExports: string[];
}

/** 모듈의 공개 API 명세. module-main-analyzer가 생성한다. */
export interface PublicApi {
  exports: ModuleExportInfo[];
  types: string[];
  functions: string[];
  classes: string[];
}
