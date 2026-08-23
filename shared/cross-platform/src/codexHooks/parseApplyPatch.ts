import type { ApplyPatchOp, ParseApplyPatchResult } from "./types.js";

const FILE_HEADER = /^\*\*\* (Add|Update|Delete) File: (.*)$/;
const ENVIRONMENT_ID_HEADER = "*** Environment ID:";
const KIND: Record<string, ApplyPatchOp["kind"]> = {
  Add: "add",
  Update: "update",
  Delete: "delete",
};

type UpdateHunkState =
  "implicit-empty" | "explicit-empty" | "body" | "after-eof";

/**
 * Parse a Codex `apply_patch` command (V4A envelope) into its file operations.
 *
 * The envelope is `*** Begin Patch` … `*** End Patch`; each file section starts
 * with `*** Add|Update|Delete File: <path>` and is followed by `@@` hunk headers,
 * ` ` context lines, `-` removals and `+` additions. For an add the `+` lines are
 * the whole file. Parsing is all-or-nothing: an incomplete section cannot hide
 * behind an earlier valid operation. Move directives remain unsupported until
 * both their source and destination can be represented at guard boundaries.
 */
export function parseApplyPatch(command: string): ParseApplyPatchResult {
  const lines = command.split(/\r?\n/);
  while (lines.at(-1) === "") lines.pop();

  if (lines[0] !== "*** Begin Patch" || lines.at(-1) !== "*** End Patch")
    return invalid("missing V4A Begin/End envelope");

  const ops: ApplyPatchOp[] = [];
  let current: ApplyPatchOp | null = null;
  let updateHunkState: UpdateHunkState | null = null;
  const body = lines.slice(1, -1);
  let bodyStart = 0;

  if (body[0]?.startsWith(ENVIRONMENT_ID_HEADER)) {
    if (body[0].slice(ENVIRONMENT_ID_HEADER.length).trim() === "")
      return invalid("Environment ID is empty");
    bodyStart = 1;
  }

  const finishCurrent = (): string | null => {
    if (!current) return null;
    if (current.kind === "update" && updateHunkState === "implicit-empty")
      return "Update section has no body";
    if (current.kind === "update" && updateHunkState === "explicit-empty")
      return "Update hunk does not contain any lines";
    return null;
  };

  for (const line of body.slice(bodyStart)) {
    const header = FILE_HEADER.exec(line);
    if (header) {
      const previousError = finishCurrent();
      if (previousError) return invalid(previousError);
      const filePath = header[2].trim();
      if (filePath === "") return invalid("file section has an empty target");
      const kind = KIND[header[1]];
      current = {
        kind,
        filePath,
        addedLines: [],
        removedLines: [],
      };
      updateHunkState = kind === "update" ? "implicit-empty" : null;
      ops.push(current);
      continue;
    }

    if (!current) return invalid("content appears before a file section");
    if (line.startsWith(ENVIRONMENT_ID_HEADER))
      return invalid(
        "Environment ID must appear once immediately after Begin Patch",
      );
    if (line.startsWith("*** Move to:"))
      return invalid("Move to sections are unsupported");

    if (current.kind === "delete")
      return invalid("Delete section must not have a body");

    if (current.kind === "add") {
      if (!line.startsWith("+"))
        return invalid("Add section contains a non-add line");
      current.addedLines.push(line.slice(1));
      continue;
    }

    if (line === "@@" || line.startsWith("@@ ")) {
      if (updateHunkState === "explicit-empty")
        return invalid("Update hunk does not contain any lines");
      updateHunkState = "explicit-empty";
      continue;
    }
    if (line === "*** End of File") {
      if (updateHunkState !== "body")
        return invalid("End of File follows an empty update hunk");
      updateHunkState = "after-eof";
      continue;
    }
    if (
      line !== "" &&
      !line.startsWith(" ") &&
      !line.startsWith("+") &&
      !line.startsWith("-")
    )
      return invalid("Update section contains an unrecognized line");
    if (updateHunkState === "after-eof")
      return invalid("Update body after End of File needs a new hunk header");

    updateHunkState = "body";
    if (line.startsWith("+")) current.addedLines.push(line.slice(1));
    else if (line.startsWith("-")) current.removedLines.push(line.slice(1));
  }

  const finalError = finishCurrent();
  if (finalError) return invalid(finalError);
  if (ops.length === 0) return invalid("patch has no file operations");

  return {
    ok: true,
    operations: ops as [ApplyPatchOp, ...ApplyPatchOp[]],
  };
}

function invalid(reason: string): ParseApplyPatchResult {
  return { ok: false, reason: `Invalid apply_patch command: ${reason}` };
}
