import {
  agyToClaudeInput,
  claudeToAgyResponse,
  type AgyCommonInput,
  type AgyHookResponse,
  type ClaudeHookEvent,
  type ClaudeHookInput,
  type ClaudeHookOutput,
} from "../agyHooks/index.js";

export interface RunAgyHookDeps {
  /** The agy payload parsed from stdin. */
  agyPayload: AgyCommonInput & Record<string, unknown>;
  /** Which Claude role this invocation plays (from the hooks.json command args). */
  claudeEvent: ClaudeHookEvent;
  /**
   * Run the bundled Claude handler with the translated payload. Returns its parsed
   * output, or null when it failed / produced nothing — the runner then no-ops rather
   * than blocking the agent.
   */
  runHandler: (claudeInput: ClaudeHookInput) => ClaudeHookOutput | null;
  /**
   * True the first time this conversation reaches a SessionStart handler; false after.
   * agy's PreInvocation fires before every model turn, but SessionStart must run once —
   * this guard collapses the many PreInvocations of a conversation to a single one.
   */
  claimSessionStartOnce: () => boolean;
}

/**
 * Bridge one agy hook invocation to a bundled Claude handler and back.
 *
 * Pure orchestration: every side effect (stdin, the marker file, spawning the handler)
 * is injected, so the mapping and the once-guard are unit-testable without a live agy.
 * The empty-`injectSteps` no-op is the safe default on every early return — a hook must
 * never wedge the agent loop.
 */
export function runAgyHook(deps: RunAgyHookDeps): AgyHookResponse {
  if (deps.claudeEvent === "SessionStart" && !deps.claimSessionStartOnce()) {
    return { injectSteps: [] };
  }

  const claudeInput = agyToClaudeInput(deps.agyPayload, deps.claudeEvent);
  const claudeOutput = deps.runHandler(claudeInput);
  if (claudeOutput === null) return { injectSteps: [] };

  return claudeToAgyResponse(claudeOutput, deps.claudeEvent);
}
