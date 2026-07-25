import { requireAbsoluteRoot } from "@ogham/cross-platform/host-paths/absolute-root";
import { resolveContainedPath } from "@ogham/cross-platform/paths/contained";

import type {
  DirectoryRuleTarget,
  ProjectTargetOptions,
  SectionArtifactTarget,
} from "../types/targetTypes.js";
import { resolveCodexSectionTarget } from "./resolveCodexSectionTarget.js";

export function resolveProjectRuleTarget(
  options: ProjectTargetOptions,
): DirectoryRuleTarget | SectionArtifactTarget {
  const root = requireAbsoluteRoot(options.projectRoot);
  if (options.host === "codex") return resolveCodexSectionTarget(root);
  if (options.host === "claude") {
    const directoryPath = resolveContainedPath(root, ".claude", "rules");
    return {
      kind: "directory",
      root,
      directoryPath,
      lockTarget: resolveContainedPath(directoryPath, ".ogham-agent-rules"),
    };
  }
  throw new Error(`Unsupported artifact host: ${String(options.host)}`);
}
