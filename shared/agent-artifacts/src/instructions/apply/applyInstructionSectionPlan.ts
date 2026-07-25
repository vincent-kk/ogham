import { applyFilePlan, createRevision } from "../../transactions/index.js";
import type {
  InstructionSectionApplyResult,
  InstructionSectionPlan,
} from "../../types/instructions.js";

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
