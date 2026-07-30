import { readUtf8FileIfExistsSync } from "@ogham/cross-platform";

import type {
  HookInstructionSectionOptions,
  HookInstructionSnapshot,
} from "../types/types.js";

export function readHookInstructionSnapshot(
  options: HookInstructionSectionOptions,
): HookInstructionSnapshot {
  let effectiveSource: string | null = null;
  let sourcePath: string | null = null;
  let sourceSource: string | null = null;
  let sectionContent: string | null = null;
  let conflictReason: HookInstructionSnapshot[5] = null;

  for (const path of options.target.candidatePaths) {
    const source = readUtf8FileIfExistsSync(path);
    if (path === options.target.effectivePath) effectiveSource = source;
    const startIndex = source?.indexOf(options.markers.start) ?? -1;
    const endIndex = source?.indexOf(options.markers.end) ?? -1;
    const halfWritten = (startIndex === -1) !== (endIndex === -1);
    const duplicate =
      startIndex !== -1 &&
      (startIndex !== source?.lastIndexOf(options.markers.start) ||
        endIndex !== source?.lastIndexOf(options.markers.end));

    if (halfWritten || (startIndex !== -1 && startIndex >= endIndex))
      conflictReason = "malformed-markers";
    else if (duplicate) conflictReason = "duplicate-markers";
    else if (startIndex !== -1 && source !== null) {
      if (sourcePath !== null) conflictReason = "multiple-candidates";
      sourcePath = path;
      sourceSource = source;
      sectionContent = source
        .slice(startIndex + options.markers.start.length, endIndex)
        .trim();
    }
  }

  const target =
    options.target.placement === "existing-or-effective" &&
    conflictReason === null &&
    sourcePath !== null
      ? sourcePath
      : options.target.effectivePath;

  return [
    target,
    target === sourcePath ? sourceSource : effectiveSource,
    conflictReason === null ? sourcePath : null,
    conflictReason === null ? sourceSource : null,
    conflictReason === null ? sectionContent : null,
    conflictReason,
  ];
}
