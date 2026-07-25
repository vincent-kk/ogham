import { withFileLockSync } from "@ogham/cross-platform/filesystem";

import type {
  ApplyFilePlanResult,
  FilePlan,
} from "../types/transactionTypes.js";
import { createRevision } from "../planning/createRevision.js";
import { applyChange } from "./applyChange.js";

export function applyFilePlan(plan: FilePlan): ApplyFilePlanResult {
  const locked = withFileLockSync(
    plan.lockTarget,
    () => {
      if (createRevision(plan.revisionPaths) !== plan.expectedRevision)
        return {
          status: "conflict" as const,
          reason: "revision" as const,
          applied: [],
        };

      const applied: string[] = [];
      for (const change of plan.changes) {
        applyChange(change);
        applied.push(change.targetPath);
      }
      return { status: "applied" as const, applied };
    },
    plan.lockOptions,
  );

  return locked.acquired
    ? locked.value
    : { status: "conflict", reason: "lock", applied: [] };
}
