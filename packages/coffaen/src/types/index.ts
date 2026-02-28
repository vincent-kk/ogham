/**
 * @file index.ts
 * @description coffaen 타입 중앙 export
 */

export type { NodeId, EdgeType, LinkDirection, AutonomyLevel, SourceType } from './common.js';
export { Layer, toNodeId } from './common.js';

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

export type {
  CoffaenCreateInput,
  CoffaenReadInput,
  CoffaenUpdateInput,
  CoffaenDeleteInput,
  CoffaenMoveInput,
  KgSearchInput,
  KgNavigateInput,
  KgContextInput,
  KgStatusInput,
  CoffaenCrudResult,
  CoffaenReadResult,
  KgSearchResult,
  KgNavigateResult,
  KgContextResult,
  KgStatusResult,
} from './mcp.js';
