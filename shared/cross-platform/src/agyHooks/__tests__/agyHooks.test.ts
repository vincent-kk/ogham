import { describe, expect, it } from "vitest";

import { agyEventFor } from "../eventMap.js";
import { agyToClaudeInput } from "../toClaudeInput.js";
import { claudeToAgyResponse } from "../toAgyResponse.js";

const AGY = {
  conversationId: "conv-123",
  workspacePaths: ["/Users/v/Workspace/app"],
  invocationNum: 3,
};

describe("agyToClaudeInput", () => {
  it("maps a SessionStart from agy's conversation + workspace", () => {
    expect(agyToClaudeInput(AGY, "SessionStart")).toEqual({
      cwd: "/Users/v/Workspace/app",
      session_id: "conv-123",
      hook_event_name: "SessionStart",
      source: "startup",
    });
  });

  it("maps a UserPromptSubmit with an empty prompt agy never carries", () => {
    expect(agyToClaudeInput(AGY, "UserPromptSubmit")).toEqual({
      cwd: "/Users/v/Workspace/app",
      session_id: "conv-123",
      hook_event_name: "UserPromptSubmit",
      prompt: "",
    });
  });

  it("takes cwd from workspacePaths[0], not the runner's own directory", () => {
    const out = agyToClaudeInput(
      { ...AGY, workspacePaths: ["/proj/a", "/proj/b"] },
      "SessionStart",
    );
    expect(out.cwd).toBe("/proj/a");
  });

  it("falls back to an empty cwd when agy sends no workspace, never to a guess", () => {
    expect(agyToClaudeInput({ conversationId: "c" }, "SessionStart").cwd).toBe(
      "",
    );
  });

  it("falls back to an empty session_id when conversationId is absent", () => {
    expect(
      agyToClaudeInput({ workspacePaths: ["/p"] }, "UserPromptSubmit")
        .session_id,
    ).toBe("");
  });

  it("ignores a non-string workspace entry rather than trusting it", () => {
    expect(
      agyToClaudeInput(
        { workspacePaths: [42] as unknown as string[] },
        "SessionStart",
      ).cwd,
    ).toBe("");
  });

  it("throws on a tool event, which needs argument translation not yet built", () => {
    expect(() => agyToClaudeInput(AGY, "PreToolUse")).toThrow(/unsupported/);
  });
});

describe("claudeToAgyResponse", () => {
  it("turns injected context into a single ephemeral step", () => {
    const out = claudeToAgyResponse(
      {
        continue: true,
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: "[filid] FCA-AI active.",
        },
      },
      "SessionStart",
    );
    expect(out).toEqual({
      injectSteps: [{ ephemeralMessage: "[filid] FCA-AI active." }],
    });
  });

  it("returns an empty step list when the handler injects nothing", () => {
    expect(claudeToAgyResponse({ continue: true }, "UserPromptSubmit")).toEqual({
      injectSteps: [],
    });
  });

  it("treats an empty-string context as nothing to inject", () => {
    expect(
      claudeToAgyResponse(
        { hookSpecificOutput: { additionalContext: "" } },
        "SessionStart",
      ),
    ).toEqual({ injectSteps: [] });
  });

  it("throws on a tool event, whose permission decision is a later stage", () => {
    expect(() => claudeToAgyResponse({}, "PostToolUse")).toThrow(/unsupported/);
  });
});

describe("agyEventFor", () => {
  it("rides both prompt-time events on PreInvocation, keeps tool events by name", () => {
    expect(agyEventFor("SessionStart")).toBe("PreInvocation");
    expect(agyEventFor("UserPromptSubmit")).toBe("PreInvocation");
    expect(agyEventFor("PreToolUse")).toBe("PreToolUse");
    expect(agyEventFor("PostToolUse")).toBe("PostToolUse");
  });
});
