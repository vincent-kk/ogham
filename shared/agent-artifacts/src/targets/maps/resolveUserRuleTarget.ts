import { resolveContainedPath, hostStateRoot } from "@ogham/cross-platform";

import type {
  DirectoryRuleTarget,
  SectionArtifactTarget,
  UserTargetOptions,
} from "../types/targetTypes.js";
import { resolveCodexSectionTarget } from "./resolveCodexSectionTarget.js";

export function resolveUserRuleTarget(
  options: UserTargetOptions,
): DirectoryRuleTarget | SectionArtifactTarget {
  const root = hostStateRoot(options.host, options.env);
  if (options.host === "codex") return resolveCodexSectionTarget(root);
  if (options.host === "claude") {
    const directoryPath = resolveContainedPath(root, "rules");
    return {
      kind: "directory",
      root,
      directoryPath,
      lockTarget: resolveContainedPath(directoryPath, ".ogham-agent-rules"),
    };
  }
  throw new Error(`Unsupported artifact host: ${String(options.host)}`);
}
