import { agyToolToClaude } from "./toolMap.js";
import type {
  AgyCommonInput,
  AgyToolCall,
  ClaudeHookEvent,
  ClaudeHookInput,
} from "./types.js";

/** The directory part of an absolute path — pure, POSIX and Windows separators. */
function parentDir(p: string): string {
  const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  return i > 0 ? p.slice(0, i) : "";
}

/**
 * Build the Claude snake_case payload a bundled ogham handler expects, from agy's
 * camelCase invocation payload.
 *
 * agy does not hand a hook the session cwd the way Claude does — the workspace is
 * `workspacePaths[0]`, so that becomes the handler's `cwd` (where `.filid/config.json`,
 * the vault, and rule docs live). The conversation id stands in for the session id.
 *
 * PreInvocation carries no prompt text, so a UserPromptSubmit synthesised from it has an
 * empty prompt. The ogham prompt hooks inject context and gate on first-in-session,
 * neither of which reads the prompt body, so nothing is lost.
 *
 * PreToolUse maps agy's `toolCall` onto Claude `tool_name`/`tool_input` (via toolMap) so
 * the bundled Write/Edit guards run. agy sends no project directory on a PreToolUse hook
 * (`workspacePaths` is empty in `--print`, there is no GEMINI_PROJECT_DIR, and the hook
 * cwd is the plugin dir — measured 2026-07-15), so when the workspace is absent the
 * gated file's own directory stands in for cwd; the guards walk up from there to find
 * `.filid`/`.maencof`. PostToolUse still needs its own contract and is rejected loudly.
 */
export function agyToClaudeInput(
  agy: AgyCommonInput & Record<string, unknown>,
  claudeEvent: ClaudeHookEvent,
): ClaudeHookInput {
  const session_id =
    typeof agy.conversationId === "string" ? agy.conversationId : "";
  const workspace = agy.workspacePaths;
  const cwd =
    Array.isArray(workspace) && typeof workspace[0] === "string"
      ? workspace[0]
      : "";
  const base: ClaudeHookInput = {
    cwd,
    session_id,
    hook_event_name: claudeEvent,
  };

  switch (claudeEvent) {
    case "SessionStart":
      return { ...base, source: "startup" };
    case "UserPromptSubmit":
      return { ...base, prompt: "" };
    case "PreToolUse": {
      const toolCall = agy["toolCall"] as AgyToolCall | undefined;
      const { tool_name, tool_input } = agyToolToClaude(
        toolCall?.name ?? "",
        toolCall?.args,
      );
      const filePath = tool_input["file_path"];
      const fallbackCwd =
        typeof filePath === "string" ? parentDir(filePath) : "";
      return { ...base, cwd: cwd || fallbackCwd, tool_name, tool_input };
    }
    default:
      throw new Error(
        `agyToClaudeInput: unsupported event "${claudeEvent}" — PostToolUse translation is a later stage`,
      );
  }
}
