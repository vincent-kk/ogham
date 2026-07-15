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
 * Only PreInvocation-mapped events are handled; the tool events carry a permission
 * decision that is a later stage, and are rejected loudly rather than mistranslated.
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
  throw new Error(
    `claudeToAgyResponse: unsupported event "${claudeEvent}" — only PreInvocation-mapped events are translated for now`,
  );
}
