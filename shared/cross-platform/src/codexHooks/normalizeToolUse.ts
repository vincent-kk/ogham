import { parseApplyPatch } from "./parseApplyPatch.js";
import { parseBashRead } from "./parseBashRead.js";
import type {
  ApplyPatchOp,
  CodexToolUse,
  NormalizedCodexToolUse,
  NormalizeCodexToolUsesResult,
} from "./types.js";

/**
 * Rewrite a Codex tool call into the Claude hook-input vocabulary the bundled
 * ogham handlers match on, so path-based guards fire on Codex the way they do on
 * Claude. Codex carries both an edit's patch and a shell command in the same
 * `tool_input.command` field, so a Claude `Write`/`Edit`/`Read` (which has no
 * `command`) short-circuits here and is returned untouched — as is any agy or MCP
 * tool call.
 *
 * `apply_patch` → `Write`/`Edit`/`Delete`: Codex sends file edits as
 * `{tool_name:"apply_patch", tool_input:{command:<V4A patch>}}` with no `file_path`.
 * An add becomes `Write` (its `+` lines are the whole file); an update becomes
 * `Edit` (`old_string`/`new_string` from the hunk; the handler re-reads the real
 * file on disk to simulate the change). Every file operation becomes a separate
 * logical hook input; consumers merge their decisions for the physical call.
 *
 * `Bash` → `Read`: Codex has no Read tool, so the model reads files by shelling
 * out (`cat foo.md`). A simple single-file read is rewritten to `Read` so the
 * vault redirector's advisory reaches the model (Codex now injects PreToolUse
 * `additionalContext` — openai/codex #20692, merged 2026-05-05). Only maencof's
 * `*` matcher forwards Bash to a hook, so this is inert for products whose hook
 * matcher excludes Bash and effectively Codex-scoped in practice.
 *
 * Multi-file patch order is preserved. Parsing is all-or-nothing so consumers
 * never mistake a valid prefix for the complete physical operation.
 */
export function normalizeCodexToolUses<T extends CodexToolUse>(
  input: T,
): NormalizeCodexToolUsesResult<T> {
  if (input.tool_name === "apply_patch") {
    const command = input.tool_input?.["command"];
    if (typeof command !== "string")
      return {
        ok: false,
        original: input,
        reason:
          "Invalid apply_patch command: tool_input.command must be a string",
      };

    const parsed = parseApplyPatch(command);
    if (!parsed.ok) return { ...parsed, original: input };
    return {
      ok: true,
      original: input,
      toolUses: parsed.operations.map((operation) =>
        normalizeOperation(input, operation),
      ) as [NormalizedCodexToolUse<T>, ...NormalizedCodexToolUse<T>[]],
    };
  }

  const command = input.tool_input?.["command"];
  if (input.tool_name === "Bash" && typeof command === "string") {
    const filePath = parseBashRead(command);
    if (!filePath) return passthrough(input);

    return {
      ok: true,
      original: input,
      toolUses: [
        {
          ...input,
          tool_name: "Read",
          tool_input: { ...input.tool_input, file_path: filePath },
        } as unknown as NormalizedCodexToolUse<T>,
      ],
    };
  }

  return passthrough(input);
}

function normalizeOperation<T extends CodexToolUse>(
  input: T,
  operation: ApplyPatchOp,
): NormalizedCodexToolUse<T> {
  const toolInput = {
    ...input.tool_input,
    file_path: operation.filePath,
  };

  if (operation.kind === "add")
    return {
      ...input,
      tool_name: "Write",
      tool_input: { ...toolInput, content: operation.addedLines.join("\n") },
    } as unknown as NormalizedCodexToolUse<T>;

  if (operation.kind === "update")
    return {
      ...input,
      tool_name: "Edit",
      tool_input: {
        ...toolInput,
        old_string: operation.removedLines.join("\n"),
        new_string: operation.addedLines.join("\n"),
      },
    } as unknown as NormalizedCodexToolUse<T>;

  return {
    ...input,
    tool_name: "Delete",
    tool_input: toolInput,
  } as unknown as NormalizedCodexToolUse<T>;
}

function passthrough<T extends CodexToolUse>(
  input: T,
): NormalizeCodexToolUsesResult<T> {
  return {
    ok: true,
    original: input,
    toolUses: [input as unknown as NormalizedCodexToolUse<T>],
  };
}
