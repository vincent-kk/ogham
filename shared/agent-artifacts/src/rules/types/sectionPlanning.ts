import type { SectionArtifactTarget } from "../../targets/index.js";
import type { ArtifactOutcome } from "../../types/artifacts.js";
import type { RuleActionDecision } from "./internal.js";

export interface SectionRulePlanningState {
  readonly owner: string;
  readonly namespace: string;
  readonly target: SectionArtifactTarget;
  readonly paths: readonly string[];
  readonly contents: Map<string, string>;
  readonly changedPaths: Set<string>;
  readonly outcomes: ArtifactOutcome[];
  /** Physical paths changed by each logical outcome, including relocation cleanup. */
  readonly outcomePaths: Map<number, readonly string[]>;
  readonly mutatingOutcomeIndexes: Set<number>;
}

export interface SectionRulePlacement {
  readonly decision: RuleActionDecision;
  readonly destination: string;
  readonly outcomeTarget: string;
}
