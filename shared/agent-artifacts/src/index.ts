export type {
  ArtifactHost,
  ArtifactManager,
  ProjectArtifactManagerOptions,
} from "./project/index.js";
export { createProjectArtifactManager } from "./project/index.js";
export type { UserArtifactManagerOptions } from "./user/index.js";
export { createUserArtifactManager } from "./user/index.js";
export type {
  ManagedRuleDocument,
  RuleDocumentManager,
  RuleDocumentPlan,
  RuleDocumentRequest,
} from "./rules/index.js";
export type {
  InstructionBackup,
  InstructionSectionManager,
  InstructionSectionPlan,
  InstructionSectionRequest,
} from "./instructions/index.js";
export type {
  McpServerDefinition,
  McpServerManager,
  McpServerPlan,
  McpServerRequest,
} from "./mcp/index.js";
export { resolveProjectTargets, resolveUserTargets } from "./targets/index.js";
export type {
  ArtifactKind,
  ArtifactScope,
  ArtifactTargetSet,
  CliMcpTarget,
  DirectoryRuleTarget,
  FileMcpTarget,
  SectionArtifactTarget,
} from "./targets/index.js";
export { applyFilePlan, createRevision } from "./transactions/index.js";
export type {
  ApplyFilePlanResult,
  ArtifactAction,
  ArtifactApplyResult,
  ArtifactOutcome,
  ArtifactPlan,
  ArtifactRevision,
  FileChange,
  FilePlan,
} from "./transactions/index.js";
