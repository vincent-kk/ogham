import type {
  ArtifactApplyResult,
  ArtifactPartialFailure,
} from "../../types/artifacts.js";
import type { RuleDocumentPlan } from "../../types/rules.js";
import { applyFilePlan, createRevision } from "../../transactions/index.js";
import type { SectionRuleExecution } from "../types/internal.js";

/**
 * Applies a combined section plan and reports each document against its required paths.
 * @param plan Requested document outcomes.
 * @param execution Prepared file plan with the physical paths each document changes.
 * @returns Completed or partial document outcomes, current revisions and file progress.
 */
export function applySectionRules(
  plan: RuleDocumentPlan,
  execution: SectionRuleExecution,
): ArtifactApplyResult {
  const outcomes = [...plan.outcomes];
  const partialFailures: ArtifactPartialFailure[] = [];

  if (execution.filePlan !== null)
    try {
      const result = applyFilePlan(execution.filePlan);
      if (result.status === "partial") {
        partialFailures.push(result);
        for (const index of execution.mutatingOutcomeIndexes) {
          const outcome = outcomes[index];
          const paths = execution.outcomePaths.get(index) ?? [];
          if (
            outcome !== undefined &&
            paths.some((path) => !result.applied.includes(path))
          )
            outcomes[index] = {
              ...outcome,
              action: "partial",
              reason: `file operation failed at ${result.failed.target}: ${result.failed.error}`,
            };
        }
      }
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
    ...(partialFailures.length === 0 ? {} : { partialFailures }),
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
