import type {
  ArtifactApplyResult,
  ArtifactPartialFailure,
} from "../../types/artifacts.js";
import type { RuleDocumentPlan } from "../../types/rules.js";
import { applyFilePlan, createRevision } from "../../transactions/index.js";
import type { DirectoryRuleExecution } from "../types/internal.js";

/**
 * Applies independent directory plans and retains progress for any interrupted plan.
 * @param plan Requested document outcomes.
 * @param execution Prepared per-document plans and revision paths.
 * @returns Per-document outcomes, current revisions and each interrupted file plan.
 */
export function applyDirectoryRules(
  plan: RuleDocumentPlan,
  execution: DirectoryRuleExecution,
): ArtifactApplyResult {
  const outcomes = [...plan.outcomes];
  const partialFailures: ArtifactPartialFailure[] = [];

  for (const entry of execution.entries)
    try {
      const result = applyFilePlan(entry.filePlan);
      if (result.status === "partial") {
        partialFailures.push(result);
        const outcome = outcomes[entry.outcomeIndex];
        if (outcome !== undefined)
          outcomes[entry.outcomeIndex] = {
            ...outcome,
            action: "partial",
            reason: `file operation failed at ${result.failed.target}: ${result.failed.error}`,
          };
      }
      if (result.status === "conflict") {
        const outcome = outcomes[entry.outcomeIndex];
        if (outcome !== undefined)
          outcomes[entry.outcomeIndex] = {
            ...outcome,
            action: "conflict",
            reason: result.reason,
          };
      }
    } catch (error) {
      const outcome = outcomes[entry.outcomeIndex];
      if (outcome !== undefined)
        outcomes[entry.outcomeIndex] = {
          ...outcome,
          action: "skip",
          reason:
            error instanceof Error
              ? `file operation failed: ${error.message}`
              : "file operation failed",
        };
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
