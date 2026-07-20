import { describe, expect, it, vi } from "vitest";

import type { ClaudeHookInput } from "../../agyHooks/index.js";
import { runAgyHook } from "../runAgyHook.js";

const AGY = { conversationId: "c1", workspacePaths: ["/proj"] };

/** A handler that echoes a fixed Claude output and records what it was fed. */
function handlerReturning(output: unknown) {
  const seen: ClaudeHookInput[] = [];
  const runHandler = (input: ClaudeHookInput) => {
    seen.push(input);
    return output as never;
  };
  return { runHandler, seen };
}

describe("runAgyHook", () => {
  it("translates a first SessionStart and injects the handler's context", () => {
    const { runHandler, seen } = handlerReturning({
      hookSpecificOutput: { additionalContext: "[maencof-lens] ready" },
    });
    const out = runAgyHook({
      agyPayload: AGY,
      claudeEvent: "SessionStart",
      runHandler,
      claimSessionStartOnce: () => true,
    });
    expect(seen[0]).toMatchObject({
      hook_event_name: "SessionStart",
      cwd: "/proj",
      session_id: "c1",
    });
    expect(out).toEqual({
      injectSteps: [{ ephemeralMessage: "[maencof-lens] ready" }],
    });
  });

  it("skips SessionStart after the once-guard is spent, without calling the handler", () => {
    const { runHandler, seen } = handlerReturning({});
    const out = runAgyHook({
      agyPayload: AGY,
      claudeEvent: "SessionStart",
      runHandler,
      claimSessionStartOnce: () => false,
    });
    expect(seen).toHaveLength(0);
    expect(out).toEqual({ injectSteps: [] });
  });

  it("runs UserPromptSubmit every time — no once-guard consulted", () => {
    const claim = vi.fn(() => true);
    const { runHandler } = handlerReturning({
      hookSpecificOutput: { additionalContext: "ctx" },
    });
    runAgyHook({
      agyPayload: AGY,
      claudeEvent: "UserPromptSubmit",
      runHandler,
      claimSessionStartOnce: claim,
    });
    expect(claim).not.toHaveBeenCalled();
  });

  it("no-ops when the handler fails (null) rather than blocking the loop", () => {
    const out = runAgyHook({
      agyPayload: AGY,
      claudeEvent: "UserPromptSubmit",
      runHandler: () => null,
      claimSessionStartOnce: () => true,
    });
    expect(out).toEqual({ injectSteps: [] });
  });

  it("no-ops when the handler injects nothing", () => {
    const { runHandler } = handlerReturning({ continue: true });
    const out = runAgyHook({
      agyPayload: AGY,
      claudeEvent: "SessionStart",
      runHandler,
      claimSessionStartOnce: () => true,
    });
    expect(out).toEqual({ injectSteps: [] });
  });
});
