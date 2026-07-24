import { describe, expect, it } from "vitest";

import { agyToClaudeInput } from "../toClaudeInput.js";
import { claudeToAgyResponse } from "../toAgyResponse.js";
import { agyToolToClaude } from "../toolMap.js";

// agy 1.1.2 PreToolUse toolCall shapes, captured 2026-07-15.
describe("agyToolToClaude", () => {
  it("maps write_to_file to Write with file_path and content", () => {
    expect(
      agyToolToClaude("write_to_file", {
        TargetFile: "/proj/01_Core/x.md",
        CodeContent: "body",
        Overwrite: false,
      }),
    ).toEqual({
      tool_name: "Write",
      tool_input: {
        TargetFile: "/proj/01_Core/x.md",
        CodeContent: "body",
        Overwrite: false,
        file_path: "/proj/01_Core/x.md",
        content: "body",
      },
    });
  });

  it("maps replace_file_content to Edit with the target as file_path", () => {
    const out = agyToolToClaude("replace_file_content", {
      TargetFile: "/proj/a.ts",
    });
    expect(out.tool_name).toBe("Edit");
    expect(out.tool_input["file_path"]).toBe("/proj/a.ts");
  });

  it("maps view_file to Read from AbsolutePath", () => {
    const out = agyToolToClaude("view_file", { AbsolutePath: "/proj/a.ts" });
    expect(out.tool_name).toBe("Read");
    expect(out.tool_input["file_path"]).toBe("/proj/a.ts");
  });

  it("maps run_command to Bash without inventing a file_path", () => {
    const out = agyToolToClaude("run_command", { CommandLine: "ls" });
    expect(out.tool_name).toBe("Bash");
    expect(out.tool_input["file_path"]).toBeUndefined();
  });

  it("passes an unknown tool through so no guard matches it", () => {
    expect(agyToolToClaude("browser_click", { X: 1 })).toEqual({
      tool_name: "browser_click",
      tool_input: { X: 1 },
    });
  });
});

describe("agyToClaudeInput — PreToolUse", () => {
  it("translates a write_to_file gate into a Claude Write PreToolUse input", () => {
    const out = agyToClaudeInput(
      {
        conversationId: "c1",
        workspacePaths: ["/proj"],
        toolCall: {
          name: "write_to_file",
          args: { TargetFile: "/proj/f.md", CodeContent: "hi" },
        },
      },
      "PreToolUse",
    );
    expect(out.tool_name).toBe("Write");
    expect((out.tool_input as Record<string, unknown>)["file_path"]).toBe(
      "/proj/f.md",
    );
    expect(out.cwd).toBe("/proj");
  });

  it("degrades to an empty tool when agy sends no toolCall", () => {
    const out = agyToClaudeInput({ conversationId: "c1" }, "PreToolUse");
    expect(out.tool_name).toBe("");
    expect(out.tool_input).toEqual({});
  });

  it("falls back to the edited file's folder for cwd when no workspace", () => {
    // agy sends no workspacePaths on a PreToolUse hook — derive cwd from the file
    // so the guards can walk up to .filid/.maencof.
    const out = agyToClaudeInput(
      {
        conversationId: "c1",
        workspacePaths: [],
        toolCall: {
          name: "write_to_file",
          args: { TargetFile: "/vault/01_Core/values.md", CodeContent: "x" },
        },
      },
      "PreToolUse",
    );
    expect(out.cwd).toBe("/vault/01_Core");
  });

  it("prefers the real workspace over the file-folder fallback", () => {
    const out = agyToClaudeInput(
      {
        conversationId: "c1",
        workspacePaths: ["/vault"],
        toolCall: {
          name: "write_to_file",
          args: { TargetFile: "/vault/01_Core/values.md" },
        },
      },
      "PreToolUse",
    );
    expect(out.cwd).toBe("/vault");
  });
});

describe("claudeToAgyResponse — PreToolUse", () => {
  it("turns a permission deny into an agy deny carrying the reason", () => {
    expect(
      claudeToAgyResponse(
        {
          hookSpecificOutput: {
            permissionDecision: "deny",
            permissionDecisionReason: "Layer 1 is protected.",
          },
        },
        "PreToolUse",
      ),
    ).toEqual({ decision: "deny", reason: "Layer 1 is protected." });
  });

  it("treats a top-level continue:false as a deny", () => {
    expect(
      claudeToAgyResponse({ continue: false }, "PreToolUse").decision,
    ).toBe("deny");
  });

  it("allows the tool when the handler does not deny", () => {
    expect(claudeToAgyResponse({ continue: true }, "PreToolUse")).toEqual({
      decision: "allow",
    });
  });

  it("allows (dropping advisory context) — agy PreToolUse has no inject channel", () => {
    expect(
      claudeToAgyResponse(
        { hookSpecificOutput: { additionalContext: "[filid:warn] …" } },
        "PreToolUse",
      ),
    ).toEqual({ decision: "allow" });
  });
});
