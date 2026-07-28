export type {
  NodeType,
  CategoryType,
  AnalysisCertainty,
  EntryPointDescriptor,
  EntryPointSurfaceEvidence,
  DocumentContractFinding,
  FractalDocumentEvidence,
  FractalNode,
  FractalTree,
  FractalTreeDto,
  DependencyEdge,
  DependencyDAG,
  DependencyEvidence,
  DependencyGraphEdge,
  DependencyGraph,
  SnapshotDiagnostic,
  LegacyCriteriaLedgerEvidence,
  ProjectSnapshot,
  DirEntry,
  ModuleInfo,
  ModuleExportInfo,
  BarrelPattern,
  PublicApi,
} from './fractal.js';

export type { ContextDocumentRef, ContextResolution } from './context.js';

export type {
  PlacementBasis,
  RequiredArtifactRole,
  RestructureUnitKind,
  RestructureNodeType,
  ContractIntent,
  RestructureDecisionReason,
  RestructureValidationCode,
  RequiredArtifact,
  ImportRewrite,
  ImportRewriteBuildResult,
  PlacementRequest,
  RestructurePlanInput,
  MoveInstruction,
  RestructurePlan,
  PlanValidationFinding,
  PlanValidationResult,
} from './restructure.js';

export type {
  ToolArtifact,
  ToolDiagnostic,
  ToolMediaType,
  ToolPayload,
  ToolPersistence,
  ToolResultEnvelope,
  ToolStatus,
} from './toolEnvelope.js';

export type {
  AdapterClaim,
  AdapterDiagnostic,
  AdapterOwnership,
  AdapterRegistry,
  AdapterResolution,
  DependencyReference,
  EntryPointInspection,
  StructureAdapter,
  VerificationAdapter,
  VerificationCaseCount,
  VerificationRole,
} from './adapters.js';

export type {
  ThreeTierBoundary,
  IntentMdSchema,
  DetailMdSchema,
  CompressionMeta,
  IntentMdValidation,
  DetailMdValidation,
  DetailAcceptanceGroup,
  DetailAcceptanceGroupValidation,
  DocumentViolation,
} from './documents.js';

export type {
  AnalyzeVerificationInput,
  ContractGroupsByOwner,
  DetailContractDocument,
  VerificationFileAnalysis,
  VerificationProjectAnalysis,
  VerificationRuleId,
  VerificationViolation,
} from './verification.js';

export type {
  HookBaseInput,
  UserPromptSubmitInput,
  PreToolUseInput,
  PostToolUseInput,
  HookOutput,
  HookInput,
  StructureGuardOutput,
  FractalContextSummary,
} from './hooks.js';

export type {
  RuleSeverity,
  RuleCategory,
  RuleScope,
  RuleGranularity,
  RuleContext,
  RuleViolation,
  Rule,
  RuleSet,
  RuleEvaluationResult,
  RuleEvaluationOptions,
  RuleOverride,
  BuiltinRuleId,
} from './rules.js';

export type { ScanOptions } from './scan.js';

export type {
  VerificationRoleSummary,
  VerificationScanSummary,
  VerificationScanData,
  ScanReport,
  ScanReportDto,
  ValidationReport,
} from './report.js';
