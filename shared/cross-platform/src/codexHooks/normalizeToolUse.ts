import { parseApplyPatch } from "./parseApplyPatch.js";
import { parseBashRead } from "./parseBashRead.js";
import type { CodexToolUse } from "./types.js";

/**
 * Rewrite a Codex tool call into the Claude hook-input vocabulary the bundled
 * ogham handlers match on, so path-based guards fire on Codex the way they do on
 * Claude. Codex carries both an edit's patch and a shell command in the same
 * `tool_input.command` field, so a Claude `Write`/`Edit`/`Read` (which has no
 * `command`) short-circuits here and is returned untouched — as is any agy or MCP
 * tool call.
 *
 * `apply_patch` → `Write`/`Edit`: Codex sends file edits as
 * `{tool_name:"apply_patch", tool_input:{command:<V4A patch>}}` with no `file_path`.
 * An add becomes `Write` (its `+` lines are the whole file); an update becomes
 * `Edit` (`old_string`/`new_string` from the hunk; the handler re-reads the real
 * file on disk to simulate the change). A delete is left as-is — Claude has no
 * delete tool and never PreToolUse-guards deletes either, so nothing is lost.
 *
 * `Bash` → `Read`: Codex has no Read tool, so the model reads files by shelling
 * out (`cat foo.md`). A simple single-file read is rewritten to `Read` so the
 * vault redirector's advisory reaches the model (Codex now injects PreToolUse
 * `additionalContext` — openai/codex #20692, merged 2026-05-05). Only maencof's
 * `*` matcher forwards Bash to a hook; filid/imbas match `Read|Write|Edit`, so
 * this is inert for them and, since Claude reads via the Read tool, effectively
 * Codex-scoped in practice.
 *
 * ponytail: first file op only. A multi-file `apply_patch` guards its first file;
 * per-op iteration is the upgrade path if models start bundling files (they emit
 * one file per patch in practice — measured 2026-07-15).
 */
export function normalizeCodexToolUse<T extends CodexToolUse>(input: T): T {
  const command = input.tool_input?.["command"];
  if (typeof command !== "string") return input;

  if (input.tool_name === "apply_patch") {
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

  if (input.tool_name === "Bash") {
    const filePath = parseBashRead(command);
    if (!filePath) return input;

    return {
      ...input,
      tool_name: "Read",
      tool_input: { ...input.tool_input, file_path: filePath },
    };
  }

  return input;
}
