import type {
  CreateInstructionSectionManagerOptions,
  InstructionSectionManager,
} from "../types/instructions.js";
import { applyInstructionSectionPlan } from "./apply/applyInstructionSectionPlan.js";
import { validateInstructionOwner } from "./helpers/validateInstructionOwner.js";
import { validateSectionArtifactTarget } from "./helpers/validateSectionArtifactTarget.js";
import { planInstructionSection } from "./planning/planInstructionSection.js";
import { inspectInstructionSection } from "./status/inspectInstructionSection.js";

export function createInstructionSectionManager(
  options: CreateInstructionSectionManagerOptions,
): InstructionSectionManager {
  validateInstructionOwner(options.owner);
  validateSectionArtifactTarget(options.target);

  return {
    inspect: (selector = {}) =>
      inspectInstructionSection({ manager: options, selector }),
    plan: (request) => planInstructionSection(options, request),
    apply: (plan) => applyInstructionSectionPlan(plan),
  };
}
