import type { ApplyPatchOp } from "./types.js";

const FILE_HEADER = /^\*\*\* (Add|Update|Delete) File: (.*)$/;
const KIND: Record<string, ApplyPatchOp["kind"]> = {
  Add: "add",
  Update: "update",
  Delete: "delete",
};

/**
 * Parse a Codex `apply_patch` command (V4A envelope) into its file operations.
 *
 * The envelope is `*** Begin Patch` … `*** End Patch`; each file section starts
 * with `*** Add|Update|Delete File: <path>` and is followed by `@@` hunk headers,
 * ` ` context lines, `-` removals and `+` additions. For an add the `+` lines are
 * the whole file. Non-change lines (`@@`, context, `*** …`, `*** Move to:`) are
 * ignored; a `Move to:` rename keeps the original path as the guarded target.
 *
 * Order is preserved, so `[0]` is the first-touched file — what a single-file
 * handler acts on. Multi-file patches keep the rest for callers that want them.
 */
export function parseApplyPatch(command: string): ApplyPatchOp[] {
  const ops: ApplyPatchOp[] = [];
  let current: ApplyPatchOp | null = null;

  for (const line of command.split("\n")) {
    const header = FILE_HEADER.exec(line);
    if (header) {
      current = {
        kind: KIND[header[1]],
        filePath: header[2].trim(),
        addedLines: [],
        removedLines: [],
      };
      ops.push(current);
      continue;
    }
    if (!current) continue;
    // `*** End Patch`, `*** Move to:`, `*** End of File`, `@@ …` are not content.
    if (line.startsWith("***") || line.startsWith("@@")) continue;
    if (line.startsWith("+")) current.addedLines.push(line.slice(1));
    else if (line.startsWith("-")) current.removedLines.push(line.slice(1));
  }

  return ops;
}
