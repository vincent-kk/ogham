/**
 * @file index.ts
 * @description @ogham/maencof 공개 API 엔트리포인트
 */

export {
  CHANGELOG_EXCLUDE,
  CHANGELOG_PENDING_MAX_CHANGES,
  CHANGELOG_STATE_FILE,
  CompanionIdentitySchema,
  CompanionIdentityV1Schema,
  CompanionInjectEnum,
  CompanionPersonalitySchema,
  CompanionSectionSchema,
  DEFAULT_DIALOGUE_CONFIG,
  DEFAULT_INSIGHT_CONFIG,
  DEFAULT_INSIGHT_STATS,
  DIALOGUE_DISABLE_ENV,
  DialogueConfigSchema,
  dirFromLayer,
  DomainSchema,
  EDGE_TYPE,
  EXPECTED_ARCHITECTURE_VERSION,
  FrontmatterSchema,
  getCompanionSchemaVersion,
  InsightCategoryFilterSchema,
  InsightConfigSchema,
  isLayer1Path,
  isValidCompanionIdentity,
  KgContextScope,
  L1_VERIFICATION_INTENSITY,
  L1ChangeReasonSchema,
  L3_SUBDIR,
  Layer,
  LAYER_DIR,
  LAYER1_PREFIX,
  layerFromDir,
  LifeDomainEnum,
  PersonSchema,
  RelationshipTypeEnum,
  SubLayerSchema,
  SYMMETRIC_RELATIONSHIPS,
  toNodeId,
  TOOL_CATEGORY_MAP,
  WATCHED_PATHS,
} from './types/index.js';
export type {
  ActivationResult,
  ActivityCategory,
  ActivityEntry,
  ActivityReadInput,
  ActivityReadResult,
  AdjacencyList,
  AgentAccessMatrix,
  AgentExecutionResult,
  AgentOperation,
  AgentRole,
  AgentUsageEntry,
  AutoFixAction,
  AutonomyLevel,
  CaptureInsightInput,
  ChangelogPendingScan,
  ChangelogState,
  CompanionCoreMinimal,
  CompanionIdentity,
  CompanionIdentityMinimal,
  CompanionIdentityV1,
  CompanionInject,
  CompanionPersonality,
  CompanionSection,
  CompanionSectionMinimal,
  ConfigBackup,
  ConfigHealthItem,
  ConfigHealthReport,
  ConfigHealthSeverity,
  ConfigIssueCategory,
  ConfigTarget,
  DailyDigest,
  DataSourceConfig,
  DataSourceType,
  DiagnosticCategory,
  DiagnosticItem,
  DiagnosticResult,
  DiagnosticSeverity,
  DialogueConfig,
  DisabledRegistry,
  DisabledRegistryEntry,
  DispatchEvent,
  DispatchInput,
  Domain,
  EchoConfig,
  EdgeType,
  Frontmatter,
  FrontmatterParseResult,
  HookConcernResult,
  InsightCategoryFilter,
  InsightConfig,
  InsightStats,
  InterviewQuestion,
  KgContextDocumentRef,
  KgContextInput,
  KgContextResult,
  KgNavigateInput,
  KgNavigateResult,
  KgSearchInput,
  KgSearchResult,
  KgSearchResultItem,
  KgStatusInput,
  KgStatusResult,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  L1AmendmentRecord,
  L1ChangeReason,
  LayerPermission,
  LifecycleAction,
  LifecycleActionConfig,
  LifecycleActionType,
  LifecycleConfig,
  LifecycleDispatchResult,
  LifecycleEvent,
  LifeDomain,
  LinkDirection,
  MaencofCreateInput,
  MaencofCrudResult,
  MaencofDeleteInput,
  MaencofMoveInput,
  MaencofReadInput,
  MaencofReadResult,
  MaencofUpdateInput,
  ManageMode,
  ManageResult,
  MergedHookOutput,
  MigrationAction,
  MigrationOp,
  MigrationPlan,
  MigrationResult,
  MigrationWAL,
  MigrationWALEntry,
  NodeId,
  PendingInsightCapture,
  PendingInsightNotification,
  Person,
  RelationshipType,
  RemindConfig,
  ReverseIndex,
  SeedResolution,
  SerializedGraph,
  SessionDayLog,
  SessionRecord,
  SessionSummary,
  SetupProgress,
  SetupStep,
  SkillLifecycleAction,
  SkillUsageEntry,
  SourceType,
  SubLayer,
  TransitionDirective,
  UsageStats,
  WorkHistoryReadInput,
  WorkHistoryReadResult,
  WorkPeriodSummary,
} from './types/index.js';
export { VERSION } from './version.js';

// Core modules
export {
  scanVault,
  buildSnapshot,
  computeChangeSet,
  scanIncrementalChanges,
  readVaultFile,
} from './core/vaultScanner/index.js';
export type {
  ScannedFile,
  FileSnapshot,
  ChangeSet,
  VaultScanOptions,
} from './core/vaultScanner/index.js';

export {
  parseYamlFrontmatter,
  extractFrontmatter,
  extractLinks,
  parseDocument,
  buildKnowledgeNode,
  parseDocumentFromFile,
} from './core/documentParser/index.js';
export type {
  MarkdownLink,
  ParsedDocument,
  NodeBuildResult,
} from './core/documentParser/index.js';

export {
  buildGraph,
  buildAdjacencyList,
  detectOrphans,
} from './core/graphBuilder/index.js';
export type {
  GraphBuilderOptions,
  GraphBuildResult,
} from './core/graphBuilder/index.js';

export {
  convertToDAG,
  applyLayerDirectionality,
} from './core/dagConverter/index.js';
export type { DAGConvertResult } from './core/dagConverter/index.js';

export {
  calculateWeights,
  computePageRank,
  normalizeWeights,
  getLayerDecay,
  LAYER_DECAY_FACTORS,
} from './core/weightCalculator/index.js';
export type { WeightCalcResult } from './core/weightCalculator/index.js';

export { runAccumulativeActivation } from './core/spreadingActivation/index.js';
export type { AccumulativeActivationParams } from './core/spreadingActivation/index.js';

export {
  CommunityDetector,
  detectCommunities,
} from './core/communityDetector/index.js';
export type {
  Community,
  CommunityDetectionResult,
  CommunityDetectorParams,
} from './core/communityDetector/index.js';

export {
  mergeMaencofSection,
  readMaencofSection,
  removeMaencofSection,
  ClaudeMdMerger,
  MAENCOF_START_MARKER,
  MAENCOF_END_MARKER,
} from './core/claudeMdMerger/index.js';
export type { MergeResult } from './core/claudeMdMerger/index.js';

export { deduplicateContent } from './core/contentDedup/index.js';
export type { DeduplicateResult } from './core/contentDedup/index.js';

// Search modules
export {
  query,
  resolveSeedNodes,
  deriveContextSeeds,
  QueryEngine,
  invalidateQueryCache,
} from './search/queryEngine/index.js';
export type {
  QueryOptions,
  QueryResult,
  ResolvedSeedNodes,
  ScoredSeed,
  MatchType,
} from './search/queryEngine/index.js';

export {
  assembleContext,
  extractBestSnippet,
  ContextAssembler,
} from './search/contextAssembler/index.js';
export type {
  ContextItem,
  AssembleOptions,
  AssembledContext,
} from './search/contextAssembler/index.js';

// Index modules
export {
  serializeGraph,
  deserializeGraph,
  MetadataStore,
  CACHE_FILES,
} from './core/indexer/metadataStore/index.js';
export type {
  SnapshotEntry,
  FileSnapshot as CacheSnapshot,
  WeightsData,
  StaleEntry,
  StaleEntries,
} from './core/indexer/metadataStore/index.js';

export {
  computeChangeSet as computeIncrementalChangeSet,
  computeOneHopNeighbors,
  computeIncrementalScope,
  createSnapshot as createIncrementalSnapshot,
  IncrementalTracker,
} from './core/indexer/incrementalTracker/index.js';
export type {
  ChangeSet as IncrementalChangeSet,
  IncrementalScope,
  CurrentFileInfo,
} from './core/indexer/incrementalTracker/index.js';

// MCP modules — `createServer`/`startServer` 는 노출하지 않는다. 실행 진입점은
// esbuild 가 `mcp/serverEntry/serverEntry.ts` 에서 만드는 `bridge/mcp-server.cjs`
// 이고, 이 배럴이 `mcp/server` 를 끌어오면 `server.ts → version.ts` 참조와 맞물려
// src → mcp → mcp/server → src 의존 순환이 된다.
export {
  removeBacklinks,
  getBacklinks,
  toolResult,
  toolError,
  mapReplacer,
  handleMaencofCreate,
  handleMaencofRead,
  handleMaencofUpdate,
  handleMaencofDelete,
  handleMaencofMove,
  handleKgSearch,
  handleKgNavigate,
  handleKgContext,
  handleKgStatus,
  handleKgBuild,
} from './mcp/index.js';
export type { KgBuildInput, KgBuildResult } from './mcp/index.js';

// MCP middlewares
export { mergeStaleNodesIntoGraph } from './mcp/server/middlewares/index.js';

// Public policy constants
export { READ_REINDEX_CAP } from './constants/thresholds.js';
