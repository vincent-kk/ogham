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
} from './common.js';
export {
  Layer,
  LAYER_DIR,
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
