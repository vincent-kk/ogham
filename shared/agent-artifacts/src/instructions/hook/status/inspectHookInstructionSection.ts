import type { HookInstructionSectionInspection } from "../types/types.js";
import type { HookInstructionSectionOptions } from "../types/types.js";
import { readHookInstructionSnapshot } from "./readHookInstructionSnapshot.js";

export function inspectHookInstructionSection(
  options: HookInstructionSectionOptions,
): HookInstructionSectionInspection {
  const [target, , sourcePath, , sectionContent, reason] =
    readHookInstructionSnapshot(options);

  return {
    status:
      reason !== null ? "conflict" : sourcePath === null ? "absent" : "present",
    target,
    sourcePath,
    sectionContent,
    ...(reason === null ? {} : { reason }),
  };
}
