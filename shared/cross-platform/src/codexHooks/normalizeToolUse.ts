import { parseApplyPatch } from "./parseApplyPatch.js";
import type { CodexToolUse } from "./types.js";

/**
 * Rewrite a Codex `apply_patch` tool call into the `Write`/`Edit` shape the
 * bundled ogham hook handlers match on, so path-based guards (maencof's Layer-1
 * block, filid's structure guard) fire on Codex the way they do on Claude.
 *
 * Codex sends file edits as `{tool_name:"apply_patch", tool_input:{command:<V4A patch>}}`
 * — no `file_path`, no structured content — so the handlers, which key on Claude's
 * `Write`/`Edit` names and read `tool_input.file_path`, never engage. Here an add
 * becomes `Write` (its `+` lines are the whole file) and an update becomes `Edit`
 * (`old_string`/`new_string` from the hunk; the handler re-reads the real file on
 * disk to simulate the change). A delete is left as-is — Claude has no delete tool
 * and never PreToolUse-guards deletes either, so nothing is lost.
 *
 * Every other tool call (Claude's own `Write`/`Edit`/`Read`, Codex's `Bash`, any
 * MCP tool) is returned untouched, so Claude and agy paths are unaffected.
 *
 * ponytail: first file op only. A multi-file `apply_patch` guards its first file;
 * per-op iteration is the upgrade path if models start bundling files (they emit
 * one file per patch in practice — measured 2026-07-15).
 */
export function normalizeCodexToolUse<T extends CodexToolUse>(input: T): T {
  if (input.tool_name !== "apply_patch") return input;
  const command = input.tool_input?.["command"];
  if (typeof command !== "string") return input;

  const op = parseApplyPatch(command)[0];
  if (!op || op.kind === "delete") return input;

  const added = op.addedLines.join("\n");
  const removed = op.removedLines.join("\n");

  return {
    ...input,
    tool_name: op.kind === "add" ? "Write" : "Edit",
    tool_input: {
      ...input.tool_input,
      file_path: op.filePath,
      content: added,
      old_string: removed,
      new_string: added,
    },
  };
}
