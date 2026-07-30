import { hostStateRoot } from "@ogham/cross-platform";

import type {
  ArtifactTargetSet,
  UserTargetOptions,
} from "../types/targetTypes.js";
import { resolveUserInstructionTarget } from "./resolveUserInstructionTarget.js";
import { resolveUserMcpTarget } from "./resolveUserMcpTarget.js";
import { resolveUserRuleTarget } from "./resolveUserRuleTarget.js";

export function resolveUserTargets(
  options: UserTargetOptions,
): ArtifactTargetSet {
  const root = hostStateRoot(options.host, options.env);
  return {
    scope: "user",
    host: options.host,
    root,
    rules: resolveUserRuleTarget(options),
    instructions: resolveUserInstructionTarget(options),
    mcp: resolveUserMcpTarget(options),
  };
}
