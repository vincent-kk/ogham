import { requireAbsoluteRoot } from "@ogham/cross-platform/host-paths/absolute-root";
import { resolveContainedPath } from "@ogham/cross-platform/paths/contained";

import type {
  ProjectTargetOptions,
  SectionArtifactTarget,
} from "../types/targetTypes.js";
import { resolveCodexSectionTarget } from "./resolveCodexSectionTarget.js";

export function resolveProjectInstructionTarget(
  options: ProjectTargetOptions,
): SectionArtifactTarget {
  const root = requireAbsoluteRoot(options.projectRoot);
  if (options.host === "codex") return resolveCodexSectionTarget(root);
  if (options.host === "claude") {
    const effectivePath = resolveContainedPath(root, "CLAUDE.md");
    return {
      kind: "sections",
      root,
      effectivePath,
      candidatePaths: [
        effectivePath,
        resolveContainedPath(root, ".claude", "CLAUDE.md"),
      ],
      placement: "existing-or-effective",
      lockTarget: resolveContainedPath(root, ".ogham-agent-instructions"),
    };
  }
  throw new Error(`Unsupported artifact host: ${String(options.host)}`);
}
