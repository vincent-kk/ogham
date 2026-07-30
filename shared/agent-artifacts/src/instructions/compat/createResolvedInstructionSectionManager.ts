import { requireAbsoluteRoot, portableDirname } from "@ogham/cross-platform";

import type {
  CreateResolvedInstructionSectionManagerOptions,
  InstructionSectionManager,
} from "../../types/instructions.js";
import { createInstructionSectionManager } from "../instructions.js";

export function createResolvedInstructionSectionManager(
  options: CreateResolvedInstructionSectionManagerOptions,
): InstructionSectionManager {
  const targetPath = requireAbsoluteRoot(options.targetPath);
  const root = requireAbsoluteRoot(options.root ?? portableDirname(targetPath));

  return createInstructionSectionManager({
    owner: options.owner,
    target: {
      kind: "sections",
      root,
      effectivePath: targetPath,
      candidatePaths: [targetPath],
      placement: "existing-or-effective",
      lockTarget: targetPath,
    },
    ...(options.markers === undefined ? {} : { markers: options.markers }),
  });
}
