import type { ArtifactAction } from "../../types/artifacts.js";

export interface DecideInstructionActionOptions {
  readonly conflict: boolean;
  readonly sectionExists: boolean;
  readonly contentMatches: boolean;
  readonly remove: boolean;
  readonly replaceDrift: boolean;
  readonly relocate: boolean;
}

export function decideInstructionAction(
  options: DecideInstructionActionOptions,
): ArtifactAction {
  if (options.conflict) return "conflict";
  if (options.remove) return options.sectionExists ? "remove" : "unchanged";
  if (!options.sectionExists) return "copy";
  if (!options.contentMatches && !options.replaceDrift) return "drift";
  if (options.relocate) return "relocate";
  return options.contentMatches ? "unchanged" : "update";
}
