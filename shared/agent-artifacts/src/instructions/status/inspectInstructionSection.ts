import type { InstructionSectionInspection } from "../../types/instructions.js";
import { readInstructionCandidates } from "./readInstructionCandidates.js";
import type { InspectInstructionSectionOptions } from "./types.js";

export function inspectInstructionSection(
  options: InspectInstructionSectionOptions,
): InstructionSectionInspection {
  return readInstructionCandidates(options).inspection;
}
