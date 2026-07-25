import { resolveContainedPath } from "@ogham/cross-platform/paths/contained";
import { hostStateRoot } from "@ogham/cross-platform/paths/state-root";

import type {
  SectionArtifactTarget,
  UserTargetOptions,
} from "../types/targetTypes.js";
import { resolveCodexSectionTarget } from "./resolveCodexSectionTarget.js";

export function resolveUserInstructionTarget(
  options: UserTargetOptions,
): SectionArtifactTarget {
  const root = hostStateRoot(options.host, options.env);
  if (options.host === "codex") return resolveCodexSectionTarget(root);
  if (options.host === "claude") {
    const effectivePath = resolveContainedPath(root, "CLAUDE.md");
    return {
      kind: "sections",
      root,
      effectivePath,
      candidatePaths: [effectivePath],
      placement: "existing-or-effective",
      lockTarget: resolveContainedPath(root, ".ogham-agent-instructions"),
    };
  }
  throw new Error(`Unsupported artifact host: ${String(options.host)}`);
}
