import { agyEventFor } from "./eventMap.js";
import type {
  AgyHookResponse,
  ClaudeHookEvent,
  ClaudeHookOutput,
} from "./types.js";

/**
 * Translate a bundled handler's Claude output into agy's response contract.
 *
 * A SessionStart/UserPromptSubmit handler injects text through `additionalContext`; agy
 * consumes injected text as an ephemeral step before the model runs, so that context
 * becomes a single `injectSteps` entry. No context → an empty step list, which agy
 * treats as a no-op — the same silence the Claude handler intends when it returns none.
 *
 * A PreToolUse handler gates: a `deny` becomes agy's `{decision:"deny"}` (agy honours it
 * — measured 2026-07-15), carrying the reason. Anything else allows the tool. agy's
 * PreToolUse contract has no context channel, so a handler that only injected advisory
 * text (a warning, a redirect) allows silently — that guidance is dropped, not blocked.
 */
export function claudeToAgyResponse(
  claude: ClaudeHookOutput,
  claudeEvent: ClaudeHookEvent,
): AgyHookResponse {
  const agyEvent = agyEventFor(claudeEvent);
  if (agyEvent === "PreInvocation") {
    const context = claude.hookSpecificOutput?.additionalContext;
    return { injectSteps: context ? [{ ephemeralMessage: context }] : [] };
  }
  if (agyEvent === "PreToolUse") {
    const denied =
      claude.continue === false ||
      claude.hookSpecificOutput?.permissionDecision === "deny";
    if (denied)
      return {
        decision: "deny",
        reason: claude.hookSpecificOutput?.permissionDecisionReason ?? "",
      };
    return { decision: "allow" };
  }
  throw new Error(
    `claudeToAgyResponse: unsupported event "${claudeEvent}" — PostToolUse translation is a later stage`,
  );
}
