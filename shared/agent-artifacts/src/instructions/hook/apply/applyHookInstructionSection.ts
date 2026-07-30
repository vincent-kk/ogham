import {
  copyFileSync,
  writeUtf8FileSync,
  mergeSection,
  removeSection,
} from "@ogham/cross-platform";

import { readHookInstructionSnapshot } from "../status/readHookInstructionSnapshot.js";
import type {
  ApplyHookInstructionSectionOptions,
  HookInstructionSectionApplyResult,
} from "../types/types.js";

export function applyHookInstructionSection(
  options: ApplyHookInstructionSectionOptions,
): HookInstructionSectionApplyResult {
  const [target, targetSource, sourcePath, sourceSource, , conflictReason] =
    readHookInstructionSnapshot(options);
  if (conflictReason !== null)
    return {
      status: "conflict",
      target,
      backupPaths: [],
      reason: conflictReason,
    };

  const backupPaths: string[] = [];
  const merged = mergeSection(
    targetSource ?? "",
    options.markers,
    options.content,
  );
  if (merged !== targetSource) {
    if (targetSource !== null && options.backup === "sibling") {
      const backupPath = `${target}.bak`;
      copyFileSync(target, backupPath);
      backupPaths.push(backupPath);
    }
    writeUtf8FileSync(target, merged);
  }

  if (sourcePath !== null && sourcePath !== target && sourceSource !== null) {
    const withoutSection = removeSection(sourceSource, options.markers);
    if (withoutSection !== null && withoutSection !== sourceSource) {
      if (options.backup === "sibling") {
        const backupPath = `${sourcePath}.bak`;
        copyFileSync(sourcePath, backupPath);
        backupPaths.push(backupPath);
      }
      writeUtf8FileSync(sourcePath, withoutSection);
    }
  }

  return {
    status:
      merged !== targetSource || (sourcePath !== null && sourcePath !== target)
        ? "applied"
        : "unchanged",
    target,
    backupPaths,
  };
}
