import { resolveContainedPath } from "@ogham/cross-platform/paths/contained";

import type { SectionArtifactTarget } from "../types/targetTypes.js";
import { effectiveInstructionFile } from "./effectiveInstructionFile.js";

export function resolveCodexSectionTarget(root: string): SectionArtifactTarget {
  const overridePath = resolveContainedPath(root, "AGENTS.override.md");
  const defaultPath = resolveContainedPath(root, "AGENTS.md");
  return {
    kind: "sections",
    root,
    effectivePath: effectiveInstructionFile(overridePath, defaultPath),
    candidatePaths: [overridePath, defaultPath],
    placement: "effective",
    lockTarget: resolveContainedPath(root, ".ogham-agent-instructions"),
  };
}
