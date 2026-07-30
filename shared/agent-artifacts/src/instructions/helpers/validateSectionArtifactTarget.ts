import {
  requireAbsoluteRoot,
  portableRelative,
  resolveContainedPath,
  samePath,
} from "@ogham/cross-platform";

import type { SectionArtifactTarget } from "../../targets/index.js";

export function validateSectionArtifactTarget(
  target: SectionArtifactTarget,
): void {
  const root = requireAbsoluteRoot(target.root);
  if (target.candidatePaths.length === 0)
    throw new Error("Instruction target requires at least one candidate path");

  const paths = [
    target.effectivePath,
    target.lockTarget,
    ...target.candidatePaths,
  ];
  for (const path of paths) {
    const absolute = requireAbsoluteRoot(path);
    const relative = portableRelative(root, absolute);
    const contained = resolveContainedPath(root, relative);
    if (!samePath(contained, absolute))
      throw new Error(`Instruction target must remain inside root: "${path}"`);
  }

  if (
    !target.candidatePaths.some((path) => samePath(path, target.effectivePath))
  )
    throw new Error(
      "Instruction effective path must be one of its candidate paths",
    );
}
