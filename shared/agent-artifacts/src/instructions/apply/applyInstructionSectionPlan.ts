import { applyFilePlan, createRevision } from "../../transactions/index.js";
import type {
  InstructionSectionApplyResult,
  InstructionSectionPlan,
} from "../../types/instructions.js";

/**
 * Applies planned instruction changes and preserves partial writes and actual backups.
 * @param plan Revision-bound instruction plan from its manager.
 * @returns Instruction outcomes, current revisions and only the backups actually written on failure.
 */
export function applyInstructionSectionPlan(
  plan: InstructionSectionPlan,
): InstructionSectionApplyResult {
  if (plan.plannedFiles.length === 0)
    return {
      outcomes: plan.outcomes,
      revisions: plan.revisions,
      backupPaths: [],
    };

  const applied = applyFilePlan({
    expectedRevision: plan.expectedRevision,
    revisionPaths: plan.revisionPaths,
    lockTarget: plan.lockTarget,
    changes: plan.plannedFiles.map((file) => ({
      targetPath: file.target,
      content: file.content,
      root: plan.root,
      ...(file.backupPath === undefined ? {} : { backupPath: file.backupPath }),
    })),
  });

  if (applied.status === "partial")
    return {
      outcomes: plan.outcomes.map((outcome) => ({
        ...outcome,
        action: "partial",
        reason: `file operation failed at ${applied.failed.target}: ${applied.failed.error}`,
      })),
      revisions: plan.revisionPaths.map((target) => {
        try {
          return { target, revision: createRevision([target]) };
        } catch {
          return { target, revision: null };
        }
      }),
      backupPaths: applied.backupPaths,
      partialFailures: [applied],
    };

  if (applied.status === "conflict")
    return {
      outcomes: plan.outcomes.map((outcome) => ({
        ...outcome,
        action: "conflict",
        reason: applied.reason,
      })),
      revisions: plan.revisionPaths.map((target) => ({
        target,
        revision: createRevision([target]),
      })),
      backupPaths: [],
    };

  return {
    outcomes: plan.outcomes,
    revisions: plan.revisionPaths.map((target) => ({
      target,
      revision: createRevision([target]),
    })),
    backupPaths: plan.backupPaths,
  };
}
