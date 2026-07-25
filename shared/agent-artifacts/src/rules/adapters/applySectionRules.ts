import type { ArtifactApplyResult } from "../../types/artifacts.js";
import type { RuleDocumentPlan } from "../../types/rules.js";
import { applyFilePlan, createRevision } from "../../transactions/index.js";
import type { SectionRuleExecution } from "../types/internal.js";

export function applySectionRules(
  plan: RuleDocumentPlan,
  execution: SectionRuleExecution,
): ArtifactApplyResult {
  const outcomes = [...plan.outcomes];

  if (execution.filePlan !== null)
    try {
      const result = applyFilePlan(execution.filePlan);
      if (result.status === "conflict")
        for (const index of execution.mutatingOutcomeIndexes) {
          const outcome = outcomes[index];
          if (outcome !== undefined)
            outcomes[index] = {
              ...outcome,
              action: "conflict",
              reason: result.reason,
            };
        }
    } catch (error) {
      for (const index of execution.mutatingOutcomeIndexes) {
        const outcome = outcomes[index];
        if (outcome !== undefined)
          outcomes[index] = {
            ...outcome,
            action: "skip",
            reason:
              error instanceof Error
                ? `combined file operation failed: ${error.message}`
                : "combined file operation failed",
          };
      }
    }

  return {
    outcomes,
    revisions: execution.revisions.map((revision) => {
      try {
        return {
          target: revision.target,
          revision: createRevision(revision.revisionPaths),
        };
      } catch {
        return { target: revision.target, revision: null };
      }
    }),
  };
}
