// Public contract of @ogham/agent-artifacts. Consumers import from the package root;
// there are no subpath addresses. Every symbol below is re-exported by name
// from the file that owns it — a wildcard would let an internal rename widen
// this contract silently.

export { createResolvedInstructionSectionManager } from "./instructions/compat/createResolvedInstructionSectionManager.js";
export { applyHookInstructionSection } from "./instructions/hook/apply/applyHookInstructionSection.js";
export { inspectHookInstructionSection } from "./instructions/hook/status/inspectHookInstructionSection.js";
export type {
  ApplyHookInstructionSectionOptions,
  HookInstructionConflictReason,
  HookInstructionSectionApplyResult,
  HookInstructionSectionInspection,
  HookInstructionSectionOptions,
} from "./instructions/hook/types/types.js";
export { createInstructionSectionManager } from "./instructions/instructions.js";
export { createMcpServerManager } from "./mcp/mcp.js";
export { createProjectArtifactManager } from "./project/project.js";
export { createRuleDocumentManager } from "./rules/rules.js";
export { inspectRuleDocumentPresence } from "./rules/status/inspectRuleDocumentPresence.js";
export { inspectRuleDocumentStatus } from "./rules/status/inspectRuleDocumentStatus.js";
export { inspectTrustedRuleDocumentPresence } from "./rules/status/inspectTrustedRuleDocumentPresence.js";
export { resolveProjectTargets } from "./targets/maps/projectTargets.js";
export { resolveProjectInstructionTarget } from "./targets/maps/resolveProjectInstructionTarget.js";
export { resolveProjectMcpTarget } from "./targets/maps/resolveProjectMcpTarget.js";
export { resolveProjectRuleTarget } from "./targets/maps/resolveProjectRuleTarget.js";
export { resolveUserInstructionTarget } from "./targets/maps/resolveUserInstructionTarget.js";
export { resolveUserMcpTarget } from "./targets/maps/resolveUserMcpTarget.js";
export { resolveUserRuleTarget } from "./targets/maps/resolveUserRuleTarget.js";
export { resolveUserTargets } from "./targets/maps/userTargets.js";
export type {
  ArtifactTargetSet,
  CliMcpTarget,
  DirectoryRuleTarget,
  FileMcpTarget,
  ProjectTargetOptions,
  SectionArtifactTarget,
  UserTargetOptions,
} from "./targets/types/targetTypes.js";
export { applyFilePlan } from "./transactions/apply/applyFilePlan.js";
export { createRevision } from "./transactions/planning/createRevision.js";
export type {
  ApplyFilePlanResult,
  FileChange,
  FilePlan,
} from "./transactions/types/transactionTypes.js";
export type {
  ArtifactAction,
  ArtifactApplyResult,
  ArtifactHost,
  ArtifactKind,
  ArtifactOutcome,
  ArtifactPlan,
  ArtifactRevision,
  ArtifactScope,
  ProjectArtifactManagerOptions,
  UserArtifactManagerOptions,
} from "./types/artifacts.js";
export type {
  CreateInstructionSectionManagerOptions,
  CreateResolvedInstructionSectionManagerOptions,
  InstructionBackup,
  InstructionFilePreview,
  InstructionPlannedFile,
  InstructionSectionApplyResult,
  InstructionSectionInspection,
  InstructionSectionManager,
  InstructionSectionPlan,
  InstructionSectionRequest,
  InstructionSectionSelector,
} from "./types/instructions.js";
export type { ArtifactManager } from "./types/managers.js";
export type {
  McpApplyOptions,
  McpCliRunResult,
  McpCliRunner,
  McpFailure,
  McpFailureKind,
  McpPlanFailure,
  McpServerApplyResult,
  McpServerDefinition,
  McpServerManager,
  McpServerManagerOptions,
  McpServerPlan,
  McpServerRequest,
} from "./types/mcp.js";
export type {
  ManagedRuleDocument,
  RuleDocumentInspection,
  RuleDocumentManager,
  RuleDocumentManagerOptions,
  RuleDocumentPlan,
  RuleDocumentPresence,
  RuleDocumentRequest,
  RuleDocumentSelector,
  RuleDocumentSource,
} from "./types/rules.js";
export { createUserArtifactManager } from "./user/user.js";
