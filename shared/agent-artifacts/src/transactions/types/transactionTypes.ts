import type { FileLockOptions } from "@ogham/cross-platform";

import type { ArtifactPartialFailure } from "../../types/artifacts.js";

/** One target mutation performed atomically after optional backup creation. */
export interface FileChange {
  /** Absolute contained path to replace or remove. */
  readonly targetPath: string;
  /** Replacement bytes, or null to remove the target. */
  readonly content: string | Uint8Array | null;
  /** Containment root that forbids descendant symlink traversal. */
  readonly root: string;
  /** Optional contained copy of the target bytes before mutation. */
  readonly backupPath?: string;
}

/** Ordered file mutations bound to one locked revision snapshot. */
export interface FilePlan {
  /** Snapshot that must still match under the lock. */
  readonly expectedRevision: string;
  /** Paths included in the revision snapshot. */
  readonly revisionPaths: readonly string[];
  /** Address used by cross-platform to acquire the plan lock. */
  readonly lockTarget: string;
  /** Ordered mutations; the first error prevents all later changes. */
  readonly changes: readonly FileChange[];
  /** Optional lock policy; omission preserves cross-platform defaults. */
  readonly lockOptions?: FileLockOptions;
}

/** Locked apply outcome, preserving physical progress on the first file failure. */
export type ApplyFilePlanResult =
  | ({
      /** At least one file operation failed; applied may be empty. */
      readonly status: "partial";
    } & ArtifactPartialFailure)
  | {
      /** Every planned mutation completed. */
      readonly status: "applied";
      /** Successfully completed targets in execution order. */
      readonly applied: readonly string[];
    }
  | {
      /** No mutation started because a precondition failed. */
      readonly status: "conflict";
      /** The precondition that prevented mutation. */
      readonly reason: "revision" | "lock";
      /** Successfully completed targets in execution order. */
      readonly applied: readonly string[];
    };
