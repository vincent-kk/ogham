import { describe, expect, it } from "vitest";

import { normalizeCodexToolUse } from "../normalizeToolUse.js";
import { parseApplyPatch } from "../parseApplyPatch.js";

// Verbatim payloads captured from codex-cli 0.144.4 PreToolUse hook stdin (2026-07-15).
const UPDATE_PATCH =
  "*** Begin Patch\n*** Update File: /proj/target.txt\n@@\n-sentinel_token\n+REPLACED\n*** End Patch";
const ADD_PATCH =
  "*** Begin Patch\n*** Add File: /proj/created.txt\n+brand new file\n*** End Patch";

describe("parseApplyPatch", () => {
  it("reads an update as a single op with the hunk's - and + lines", () => {
    expect(parseApplyPatch(UPDATE_PATCH)).toEqual([
      {
        kind: "update",
        filePath: "/proj/target.txt",
        addedLines: ["REPLACED"],
        removedLines: ["sentinel_token"],
      },
    ]);
  });

  it("reads an add as one op whose added lines are the whole file", () => {
    expect(parseApplyPatch(ADD_PATCH)).toEqual([
      {
        kind: "add",
        filePath: "/proj/created.txt",
        addedLines: ["brand new file"],
        removedLines: [],
      },
    ]);
  });

  it("keeps every file section of a multi-file patch, in order", () => {
    const patch =
      "*** Begin Patch\n*** Update File: a.ts\n@@\n-x\n+y\n*** Add File: b.ts\n+hello\n*** Delete File: c.ts\n*** End Patch";
    const ops = parseApplyPatch(patch);
    expect(ops.map((o) => [o.kind, o.filePath])).toEqual([
      ["update", "a.ts"],
      ["add", "b.ts"],
      ["delete", "c.ts"],
    ]);
  });

  it("ignores @@, context, and *** Move to:/End of File lines as content", () => {
    const patch =
      "*** Begin Patch\n*** Update File: a.ts\n*** Move to: b.ts\n@@ class Foo\n unchanged\n-old\n+new\n*** End of File\n*** End Patch";
    const [op] = parseApplyPatch(patch);
    expect(op.addedLines).toEqual(["new"]);
    expect(op.removedLines).toEqual(["old"]);
  });

  it("collects every added line of a multi-line add", () => {
    const [op] = parseApplyPatch(
      "*** Begin Patch\n*** Add File: x.md\n+line 1\n+\n+line 3\n*** End Patch",
    );
    expect(op.addedLines).toEqual(["line 1", "", "line 3"]);
  });
});

describe("normalizeCodexToolUse", () => {
  it("leaves a non-apply_patch tool call untouched", () => {
    const input = { tool_name: "Read", tool_input: { file_path: "a.ts" } };
    expect(normalizeCodexToolUse(input)).toBe(input);
  });

  it("leaves a Claude Write untouched (host-agnostic passthrough)", () => {
    const input = {
      tool_name: "Write",
      tool_input: { file_path: "a.ts", content: "x" },
    };
    expect(normalizeCodexToolUse(input)).toBe(input);
  });

  it("rewrites an update to Edit with file_path and old/new strings", () => {
    const out = normalizeCodexToolUse({
      tool_name: "apply_patch",
      tool_input: { command: UPDATE_PATCH },
    });
    expect(out.tool_name).toBe("Edit");
    expect(out.tool_input.file_path).toBe("/proj/target.txt");
    expect(out.tool_input.old_string).toBe("sentinel_token");
    expect(out.tool_input.new_string).toBe("REPLACED");
  });

  it("rewrites an add to Write whose content is the whole file", () => {
    const out = normalizeCodexToolUse({
      tool_name: "apply_patch",
      tool_input: { command: ADD_PATCH },
    });
    expect(out.tool_name).toBe("Write");
    expect(out.tool_input.file_path).toBe("/proj/created.txt");
    expect(out.tool_input.content).toBe("brand new file");
  });

  it("normalises only the first file of a multi-file patch", () => {
    const out = normalizeCodexToolUse({
      tool_name: "apply_patch",
      tool_input: {
        command:
          "*** Begin Patch\n*** Update File: first.ts\n@@\n-a\n+b\n*** Update File: second.ts\n@@\n-c\n+d\n*** End Patch",
      },
    });
    expect(out.tool_name).toBe("Edit");
    expect(out.tool_input.file_path).toBe("first.ts");
  });

  it("leaves a delete-only patch as apply_patch (no Write/Edit analogue)", () => {
    const input = {
      tool_name: "apply_patch",
      tool_input: {
        command: "*** Begin Patch\n*** Delete File: gone.ts\n*** End Patch",
      },
    };
    expect(normalizeCodexToolUse(input).tool_name).toBe("apply_patch");
  });

  it("leaves apply_patch untouched when command is missing or non-string", () => {
    const input = { tool_name: "apply_patch", tool_input: { command: 42 } };
    expect(normalizeCodexToolUse(input)).toBe(input);
  });

  it("leaves apply_patch untouched when the command has no file header", () => {
    const input = {
      tool_name: "apply_patch",
      tool_input: { command: "not really a patch" },
    };
    expect(normalizeCodexToolUse(input)).toBe(input);
  });

  it("preserves sibling input fields and other tool_input keys", () => {
    const out = normalizeCodexToolUse({
      cwd: "/proj",
      session_id: "s1",
      tool_name: "apply_patch",
      tool_input: { command: ADD_PATCH, extra: "keep" },
    });
    expect(out.cwd).toBe("/proj");
    expect(out.session_id).toBe("s1");
    expect(out.tool_input.extra).toBe("keep");
  });
});
