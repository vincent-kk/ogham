import type { SectionRulePlanningState } from "../types/sectionPlanning.js";

export function markSectionPlanConflict(state: SectionRulePlanningState): void {
  for (const [index, outcome] of state.outcomes.entries())
    state.outcomes[index] = {
      ...outcome,
      action: "conflict",
      reason: "revision-changed-during-plan",
    };
  state.changedPaths.clear();
  state.mutatingOutcomeIndexes.clear();
}
