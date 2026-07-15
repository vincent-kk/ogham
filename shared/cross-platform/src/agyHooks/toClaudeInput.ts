import type {
  AgyCommonInput,
  ClaudeHookEvent,
  ClaudeHookInput,
} from "./types.js";

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
 * Only the PreInvocation-mapped events are handled here; PreToolUse/PostToolUse need a
 * tool-name and argument translation that is a later stage, and are rejected loudly
 * rather than passed through half-formed.
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
    default:
      throw new Error(
        `agyToClaudeInput: unsupported event "${claudeEvent}" — PreToolUse/PostToolUse translation is a later stage`,
      );
  }
}
