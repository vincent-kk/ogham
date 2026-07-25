import type { FileLockOptions } from "@ogham/cross-platform/filesystem";

export interface FileChange {
  readonly targetPath: string;
  readonly content: string | Uint8Array | null;
  readonly root: string;
  readonly backupPath?: string;
}

export interface FilePlan {
  readonly expectedRevision: string;
  readonly revisionPaths: readonly string[];
  readonly lockTarget: string;
  readonly changes: readonly FileChange[];
  readonly lockOptions?: FileLockOptions;
}

export type ApplyFilePlanResult =
  | {
      readonly status: "applied";
      readonly applied: readonly string[];
    }
  | {
      readonly status: "conflict";
      readonly reason: "revision" | "lock";
      readonly applied: readonly string[];
    };
