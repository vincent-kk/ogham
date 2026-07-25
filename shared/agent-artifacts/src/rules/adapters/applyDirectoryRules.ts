import type { ArtifactApplyResult } from "../../types/artifacts.js";
import type { RuleDocumentPlan } from "../../types/rules.js";
import { applyFilePlan, createRevision } from "../../transactions/index.js";
import type { DirectoryRuleExecution } from "../types/internal.js";

export function applyDirectoryRules(
  plan: RuleDocumentPlan,
  execution: DirectoryRuleExecution,
): ArtifactApplyResult {
  const outcomes = [...plan.outcomes];

  for (const entry of execution.entries)
    try {
      const result = applyFilePlan(entry.filePlan);
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
