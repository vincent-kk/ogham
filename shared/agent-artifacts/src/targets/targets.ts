export { resolveProjectTargets } from "./maps/projectTargets.js";
export { resolveProjectInstructionTarget } from "./maps/resolveProjectInstructionTarget.js";
export { resolveProjectMcpTarget } from "./maps/resolveProjectMcpTarget.js";
export { resolveProjectRuleTarget } from "./maps/resolveProjectRuleTarget.js";
export { resolveUserInstructionTarget } from "./maps/resolveUserInstructionTarget.js";
export { resolveUserMcpTarget } from "./maps/resolveUserMcpTarget.js";
export { resolveUserRuleTarget } from "./maps/resolveUserRuleTarget.js";
export { resolveUserTargets } from "./maps/userTargets.js";
export type {
  ArtifactTargetSet,
  CliMcpTarget,
  DirectoryRuleTarget,
  FileMcpTarget,
  ProjectTargetOptions,
  SectionArtifactTarget,
  UserTargetOptions,
} from "./types/targetTypes.js";
