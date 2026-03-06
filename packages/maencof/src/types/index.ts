/**
 * @file index.ts
 * @description maencof 타입 중앙 export
 */

export type {
  NodeId,
  EdgeType,
  LinkDirection,
  AutonomyLevel,
  SourceType,
  L3SubLayer,
  L5SubLayer,
  SubLayer,
} from './common.js';
export {
  Layer,
  LAYER_DIR,
  L3_SUBDIR,
  L5_SUBDIR,
  EDGE_TYPE,
  EXPECTED_ARCHITECTURE_VERSION,
  toNodeId,
  layerFromDir,
  dirFromLayer,
} from './common.js';

export type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  AdjacencyList,
  ActivationResult,
  SerializedGraph,
} from './graph.js';

export { FrontmatterSchema } from './frontmatter.js';
export type { Frontmatter, FrontmatterParseResult } from './frontmatter.js';

export {
  PersonSchema,
  RelationshipTypeEnum,
  SYMMETRIC_RELATIONSHIPS,
} from './person.js';
export type { Person, RelationshipType } from './person.js';

export {
  CompanionIdentitySchema,
  CompanionPersonalitySchema,
} from './companion.js';
export type { CompanionIdentity, CompanionPersonality } from './companion.js';

export { isValidCompanionIdentity } from './companion-guard.js';
export type { CompanionIdentityMinimal } from './companion-guard.js';

export { DomainSchema, LifeDomainEnum } from './domain.js';
export type { Domain, LifeDomain } from './domain.js';

export type {
  AgentRole,
  LayerPermission,
  AgentOperation,
  AgentAccessMatrix,
  TransitionDirective,
  AgentExecutionResult,
} from './agent.js';

export type {
  SetupStep,
  DataSourceType,
  DataSourceConfig,
  SetupProgress,
  InterviewQuestion,
  MigrationOp,
  MigrationWALEntry,
  MigrationWAL,
  MigrationPlan,
  MigrationResult,
} from './setup.js';

export type {
  DiagnosticSeverity,
  DiagnosticCategory,
  AutoFixAction,
  DiagnosticItem,
  DiagnosticResult,
} from './doctor.js';

export type {
  SkillUsageEntry,
  AgentUsageEntry,
  UsageStats,
  SessionSummary,
} from './session.js';

export type {
  ManageMode,
  SkillLifecycleAction,
  DisabledRegistryEntry,
  DisabledRegistry,
  ManageResult,
} from './manage.js';

export { LAYER1_PREFIX, isLayer1Path } from './layer.js';

export type {
  LifecycleEvent,
  LifecycleActionType,
  EchoConfig,
  RemindConfig,
  LifecycleActionConfig,
  LifecycleAction,
  LifecycleConfig,
  LifecycleDispatchResult,
} from './lifecycle.js';

export type {
  ConfigHealthSeverity,
  ConfigIssueCategory,
  ConfigHealthItem,
  ConfigHealthReport,
  ConfigBackup,
  ConfigTarget,
  MigrationAction,
} from './configurator.js';

export { TOOL_CATEGORY_MAP } from './dailynote.js';
export type {
  DailynoteEntry,
  DailynoteCategory,
  DailynoteReadInput,
  DailynoteReadResult,
} from './dailynote.js';

export {
  CHANGELOG_CATEGORY_LABELS,
  CHANGELOG_CATEGORY_ORDER,
  CHANGELOG_DIR,
  CHANGELOG_EXCLUDE,
  CHANGELOG_GATE_MARKER,
  WATCHED_PATHS,
} from './changelog.js';
export type { ChangelogCategory, ChangelogEntry } from './changelog.js';

export type {
  MaencofCreateInput,
  MaencofReadInput,
  MaencofUpdateInput,
  MaencofDeleteInput,
  MaencofMoveInput,
  KgSearchInput,
  KgNavigateInput,
  KgContextInput,
  KgStatusInput,
  MaencofCrudResult,
  MaencofReadResult,
  KgSearchResult,
  KgNavigateResult,
  KgContextResult,
  KgStatusResult,
} from './mcp.js';

export {
  InsightConfigSchema,
  DEFAULT_INSIGHT_CONFIG,
  DEFAULT_INSIGHT_STATS,
} from './insight.js';
export type {
  InsightConfig,
  InsightStats,
  CaptureInsightInput,
  PendingInsightCapture,
  PendingInsightNotification,
} from './insight.js';
