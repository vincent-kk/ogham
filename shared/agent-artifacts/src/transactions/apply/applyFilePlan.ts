import { withFileLockSync } from "@ogham/cross-platform";

import type {
  ApplyFilePlanResult,
  FilePlan,
} from "../types/transactionTypes.js";
import { createRevision } from "../planning/createRevision.js";
import { applyChange } from "./applyChange.js";

/**
 * Applies an ordered plan under its lock and stops at the first file error.
 * @param plan Mutations and the revision snapshot observed while planning.
 * @returns Conflict, complete application, or exact partial progress with error text.
 * @throws When acquiring the lock or reading the initial revision itself fails.
 */
export function applyFilePlan(plan: FilePlan): ApplyFilePlanResult {
  const locked = withFileLockSync(
    plan.lockTarget,
    (): ApplyFilePlanResult => {
      if (createRevision(plan.revisionPaths) !== plan.expectedRevision)
        return {
          status: "conflict" as const,
          reason: "revision" as const,
          applied: [],
        };

      const applied: string[] = [];
      const backupPaths: string[] = [];
      for (const [index, change] of plan.changes.entries()) {
        try {
          applyChange(change, backupPaths);
          applied.push(change.targetPath);
        } catch (error) {
          return {
            status: "partial",
            applied,
            failed: {
              target: change.targetPath,
              error: error instanceof Error ? error.message : String(error),
            },
            notAttempted: plan.changes
              .slice(index + 1)
              .map((later) => later.targetPath),
            backupPaths,
          };
        }
      }
      return { status: "applied" as const, applied };
    },
    plan.lockOptions,
  );

  return locked.acquired
    ? locked.value
    : { status: "conflict", reason: "lock", applied: [] };
}
