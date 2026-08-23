import type {
  ApplyPatchHunkLine,
  ApplyPatchOp,
  ParseApplyPatchResult,
} from "./types.js";

const FILE_HEADER = /^\*\*\* (Add|Update|Delete) File: (.*)$/;
const ENVIRONMENT_ID_HEADER = "*** Environment ID:";
const KIND: Record<string, ApplyPatchOp["kind"]> = {
  Add: "add",
  Update: "update",
  Delete: "delete",
};

type UpdateHunkState =
  "implicit-empty" | "explicit-empty" | "body" | "after-eof";

type LineApplyResult =
  | { ok: true; updateHunkState: UpdateHunkState | null }
  | { ok: false; reason: string };

type FileSectionOpen =
  | { kind: "none" }
  | { kind: "invalid"; reason: string }
  | {
      kind: "open";
      op: ApplyPatchOp;
      updateHunkState: UpdateHunkState | null;
    };

type PreparedPatchBody =
  { ok: false; reason: string } | { ok: true; bodyLines: string[] };

/**
 * Parse a Codex `apply_patch` command (V4A envelope) into its file operations.
 *
 * The envelope is `*** Begin Patch` … `*** End Patch`; each file section starts
 * with `*** Add|Update|Delete File: <path>` and is followed by `@@` hunk headers,
 * ` ` context lines, `-` removals and `+` additions. For an add the `+` lines are
 * the whole file. Parsing is all-or-nothing: an incomplete section cannot hide
 * behind an earlier valid operation. One Move destination is retained on its
 * update so normalization can guard both the source and destination paths.
 */
export function parseApplyPatch(command: string): ParseApplyPatchResult {
  const prepared = preparePatchBody(command);
  if (!prepared.ok) return prepared;

  const ops: ApplyPatchOp[] = [];
  let current: ApplyPatchOp | null = null;
  let updateHunkState: UpdateHunkState | null = null;

  for (const line of prepared.bodyLines) {
    const opened = classifyPatchLine(line);
    if (opened.kind !== "none") {
      const previousError = finishCurrent(current, updateHunkState);
      if (previousError) return invalid(previousError);
      if (opened.kind === "invalid") return invalid(opened.reason);
      current = opened.op;
      updateHunkState = opened.updateHunkState;
      ops.push(current);
      continue;
    }

    if (!current) return invalid("content appears before a file section");
    const applied = applySectionLine(current, line, updateHunkState);
    if (!applied.ok) return invalid(applied.reason);
    updateHunkState = applied.updateHunkState;
  }

  const finalError = finishCurrent(current, updateHunkState);
  if (finalError) return invalid(finalError);
  if (ops.length === 0) return invalid("patch has no file operations");

  return {
    ok: true,
    operations: ops as [ApplyPatchOp, ...ApplyPatchOp[]],
  };
}

/**
 * Strip the V4A envelope and a leading Environment ID line.
 *
 * @param command - Raw `apply_patch` text
 * @returns Inner body lines, or a fail-closed parse result
 */
function preparePatchBody(command: string): PreparedPatchBody {
  const lines = command.split(/\r?\n/);
  while (lines.at(-1) === "") lines.pop();

  if (lines[0] !== "*** Begin Patch" || lines.at(-1) !== "*** End Patch")
    return invalid("missing V4A Begin/End envelope");

  const body = lines.slice(1, -1);
  let bodyStart = 0;

  if (body[0]?.startsWith(ENVIRONMENT_ID_HEADER)) {
    if (body[0].slice(ENVIRONMENT_ID_HEADER.length).trim() === "")
      return invalid("Environment ID is empty");
    bodyStart = 1;
  }

  return { ok: true, bodyLines: body.slice(bodyStart) };
}

/**
 * Classify a patch line as a file-section header, an empty-path header, or neither.
 *
 * @param line - One line from the patch body
 * @returns Header open data, an empty-target error, or `none`
 */
function classifyPatchLine(line: string): FileSectionOpen {
  const header = FILE_HEADER.exec(line);
  if (!header) return { kind: "none" };
  const filePath = header[2].trim();
  if (filePath === "")
    return { kind: "invalid", reason: "file section has an empty target" };
  const kind = KIND[header[1]];
  return {
    kind: "open",
    op: {
      kind,
      filePath,
      hunks: [],
      addedLines: [],
      removedLines: [],
    },
    updateHunkState: kind === "update" ? "implicit-empty" : null,
  };
}

/**
 * Close the current file section if it is an incomplete update.
 *
 * @param current - The operation being accumulated, if any
 * @param updateHunkState - Hunk progress for an update section
 * @returns An error reason, or `null` when the section may close
 */
function finishCurrent(
  current: ApplyPatchOp | null,
  updateHunkState: UpdateHunkState | null,
): string | null {
  if (!current) return null;
  if (current.kind === "update" && updateHunkState === "implicit-empty")
    return "Update section has no body";
  if (current.kind === "update" && updateHunkState === "explicit-empty")
    return "Update hunk does not contain any lines";
  if (current.kind === "update") {
    current.addedLines = current.hunks.flatMap((hunk) =>
      hunk.lines.filter((line) => line.prefix === "+").map((line) => line.text),
    );
    current.removedLines = current.hunks.flatMap((hunk) =>
      hunk.lines.filter((line) => line.prefix === "-").map((line) => line.text),
    );
  }
  return null;
}

/**
 * Dispatch a non-header body line onto the current file section.
 *
 * @param current - The open file operation
 * @param line - The body line
 * @param updateHunkState - Hunk progress when `current` is an update
 * @returns Applied hunk state, or a fail-closed reason
 */
function applySectionLine(
  current: ApplyPatchOp,
  line: string,
  updateHunkState: UpdateHunkState | null,
): LineApplyResult {
  if (line.startsWith(ENVIRONMENT_ID_HEADER))
    return {
      ok: false,
      reason: "Environment ID must appear once immediately after Begin Patch",
    };
  if (line.startsWith("*** Move to:")) {
    if (current.kind !== "update")
      return { ok: false, reason: "Move to requires an Update section" };
    const moveTo = line.slice("*** Move to:".length).trim();
    if (moveTo === "")
      return { ok: false, reason: "Move to has an empty target" };
    if (current.moveTo !== undefined)
      return { ok: false, reason: "Update section has multiple Move targets" };
    current.moveTo = moveTo;
    return {
      ok: true,
      updateHunkState:
        updateHunkState === "implicit-empty" ? "body" : updateHunkState,
    };
  }
  if (current.kind === "delete")
    return { ok: false, reason: "Delete section must not have a body" };
  if (current.kind === "add") return applyAddSection(current, line);
  return applyUpdateHunk(current, line, updateHunkState);
}

/**
 * Append a `+` line to an add section.
 *
 * @param op - The add operation being built
 * @param line - The candidate add line
 * @returns Success with a null hunk state, or a fail-closed reason
 */
function applyAddSection(op: ApplyPatchOp, line: string): LineApplyResult {
  if (!line.startsWith("+"))
    return { ok: false, reason: "Add section contains a non-add line" };
  op.addedLines.push(line.slice(1));
  return { ok: true, updateHunkState: null };
}

/**
 * Apply one update-section line: hunk header, EOF marker, or body.
 *
 * @param op - The update operation being built
 * @param line - The candidate update line
 * @param updateHunkState - Current hunk progress
 * @returns Updated hunk state, or a fail-closed reason
 */
function applyUpdateHunk(
  op: ApplyPatchOp,
  line: string,
  updateHunkState: UpdateHunkState | null,
): LineApplyResult {
  if (line === "@@" || line.startsWith("@@ ")) {
    if (updateHunkState === "explicit-empty")
      return { ok: false, reason: "Update hunk does not contain any lines" };
    op.hunks.push({ header: line === "@@" ? "" : line.slice(3), lines: [] });
    return { ok: true, updateHunkState: "explicit-empty" };
  }
  if (line === "*** End of File") {
    if (updateHunkState !== "body")
      return { ok: false, reason: "End of File follows an empty update hunk" };
    return { ok: true, updateHunkState: "after-eof" };
  }
  if (
    line !== "" &&
    !line.startsWith(" ") &&
    !line.startsWith("+") &&
    !line.startsWith("-")
  )
    return {
      ok: false,
      reason: "Update section contains an unrecognized line",
    };
  if (updateHunkState === "after-eof")
    return {
      ok: false,
      reason: "Update body after End of File needs a new hunk header",
    };

  let hunk = op.hunks.at(-1);
  if (!hunk) {
    hunk = { header: "", lines: [] };
    op.hunks.push(hunk);
  }
  let prefix: ApplyPatchHunkLine["prefix"] = " ";
  if (line.startsWith("+")) prefix = "+";
  else if (line.startsWith("-")) prefix = "-";
  hunk.lines.push({ prefix, text: line === "" ? "" : line.slice(1) });
  return { ok: true, updateHunkState: "body" };
}

function invalid(reason: string): { ok: false; reason: string } {
  return { ok: false, reason: `Invalid apply_patch command: ${reason}` };
}
