import { requireAbsoluteRoot } from "@ogham/cross-platform/host-paths/absolute-root";

import type {
  ArtifactTargetSet,
  ProjectTargetOptions,
} from "../types/targetTypes.js";
import { resolveProjectInstructionTarget } from "./resolveProjectInstructionTarget.js";
import { resolveProjectMcpTarget } from "./resolveProjectMcpTarget.js";
import { resolveProjectRuleTarget } from "./resolveProjectRuleTarget.js";

export function resolveProjectTargets(
  options: ProjectTargetOptions,
): ArtifactTargetSet {
  const root = requireAbsoluteRoot(options.projectRoot);
  return {
    scope: "project",
    host: options.host,
    root,
    rules: resolveProjectRuleTarget(options),
    instructions: resolveProjectInstructionTarget(options),
    mcp: resolveProjectMcpTarget(options),
  };
}
