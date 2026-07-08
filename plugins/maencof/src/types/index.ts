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
export { Layer, toNodeId } from './common.js';
export {
  LAYER_DIR,
  L3_SUBDIR,
  L5_SUBDIR,
  EDGE_TYPE,
  EXPECTED_ARCHITECTURE_VERSION,
  layerFromDir,
  dirFromLayer,
} from '../constants/architecture.js';

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
  CompanionIdentityV1Schema,
  CompanionIdentitySchema,
  CompanionSectionSchema,
  CompanionInjectEnum,
  CompanionPersonalitySchema,
} from './companion.js';
export type {
  CompanionIdentityV1,
  CompanionIdentity,
  CompanionSection,
  CompanionInject,
  CompanionPersonality,
} from './companion.js';

export {
  isValidCompanionIdentity,
  getCompanionSchemaVersion,
} from './companionGuard.js';
export type {
  CompanionCoreMinimal,
  CompanionSectionMinimal,
  CompanionIdentityMinimal,
} from './companionGuard.js';

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
  SessionRecord,
  SessionDayLog,
} from './session.js';

export type {
  DailyDigest,
  ReverseIndex,
  WorkPeriodSummary,
  WorkHistoryReadInput,
  WorkHistoryReadResult,
} from './workHistory.js';

export type {
  ManageMode,
  SkillLifecycleAction,
  DisabledRegistryEntry,
  DisabledRegistry,
  ManageResult,
} from './manage.js';

export { LAYER1_PREFIX } from '../constants/directories.js';
export { isLayer1Path } from './layer.js';

export { L1ChangeReasonSchema } from './l1Amendment.js';
export { L1_VERIFICATION_INTENSITY } from '../constants/l1Amendment.js';
export type { L1ChangeReason, L1AmendmentRecord } from './l1Amendment.js';

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
  DispatchEvent,
  DispatchInput,
  HookConcernResult,
  MergedHookOutput,
} from './dispatch.js';

export type {
  ConfigHealthSeverity,
  ConfigIssueCategory,
  ConfigHealthItem,
  ConfigHealthReport,
  ConfigBackup,
  ConfigTarget,
  MigrationAction,
} from './configurator.js';

export { TOOL_CATEGORY_MAP } from '../constants/activity.js';
export type {
  ActivityEntry,
  ActivityCategory,
  ActivityReadInput,
  ActivityReadResult,
} from './activity.js';

export {
  CHANGELOG_EXCLUDE,
  CHANGELOG_PENDING_MAX_CHANGES,
  CHANGELOG_STATE_FILE,
  WATCHED_PATHS,
} from './changelog.js';
export type { ChangelogPendingScan, ChangelogState } from './changelog.js';

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
export { KgContextScope } from '../constants/kgContext.js';

export {
  InsightConfigSchema,
  InsightCategoryFilterSchema,
  DEFAULT_INSIGHT_CONFIG,
  DEFAULT_INSIGHT_STATS,
} from './insight.js';
export type {
  InsightConfig,
  InsightCategoryFilter,
  InsightStats,
  CaptureInsightInput,
  PendingInsightCapture,
  PendingInsightNotification,
} from './insight.js';

export { DialogueConfigSchema } from './dialogueConfig.js';
export {
  DEFAULT_DIALOGUE_CONFIG,
  DIALOGUE_DISABLE_ENV,
} from '../constants/dialogue.js';
export type { DialogueConfig } from './dialogueConfig.js';
