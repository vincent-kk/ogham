import { describe, expect, it } from "vitest";

import { normalizeCodexToolUses } from "../normalizeToolUse.js";
import { parseApplyPatch } from "../parseApplyPatch.js";
import type { NormalizedCodexToolUse } from "../types.js";

// Verbatim payloads captured from codex-cli 0.144.4 PreToolUse hook stdin (2026-07-15).
const UPDATE_PATCH =
  "*** Begin Patch\n*** Update File: /proj/target.txt\n@@\n-sentinel_token\n+REPLACED\n*** End Patch";
const ADD_PATCH =
  "*** Begin Patch\n*** Add File: /proj/created.txt\n+brand new file\n*** End Patch";

describe("parseApplyPatch", () => {
  it("reads an update as a single op with the hunk's - and + lines", () => {
    expect(parseApplyPatch(UPDATE_PATCH)).toEqual({
      ok: true,
      operations: [
        {
          kind: "update",
          filePath: "/proj/target.txt",
          addedLines: ["REPLACED"],
          removedLines: ["sentinel_token"],
        },
      ],
    });
  });

  it("reads an add as one op whose added lines are the whole file", () => {
    expect(parseApplyPatch(ADD_PATCH)).toEqual({
      ok: true,
      operations: [
        {
          kind: "add",
          filePath: "/proj/created.txt",
          addedLines: ["brand new file"],
          removedLines: [],
        },
      ],
    });
  });

  it("reads a bodyless add as an empty-file operation", () => {
    expect(
      parseApplyPatch(
        "*** Begin Patch\n*** Add File: empty.txt\n*** End Patch",
      ),
    ).toEqual({
      ok: true,
      operations: [
        {
          kind: "add",
          filePath: "empty.txt",
          addedLines: [],
          removedLines: [],
        },
      ],
    });
  });

  it("keeps every file section of a multi-file patch, in order", () => {
    const patch =
      "*** Begin Patch\n*** Update File: a.ts\n@@\n-x\n+y\n*** Add File: b.ts\n+hello\n*** Delete File: c.ts\n*** End Patch";
    const parsed = parseApplyPatch(patch);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.operations.map((o) => [o.kind, o.filePath])).toEqual([
      ["update", "a.ts"],
      ["add", "b.ts"],
      ["delete", "c.ts"],
    ]);
  });

  it("parses CRLF multi-file patches identically", () => {
    const lf =
      "*** Begin Patch\n*** Add File: a.ts\n+a\n*** Delete File: b.ts\n*** End Patch";
    expect(parseApplyPatch(lf.replaceAll("\n", "\r\n"))).toEqual(
      parseApplyPatch(lf),
    );
  });

  it("collects every added line of a multi-line add", () => {
    const parsed = parseApplyPatch(
      "*** Begin Patch\n*** Add File: x.md\n+line 1\n+\n+line 3\n*** End Patch",
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.operations[0].addedLines).toEqual(["line 1", "", "line 3"]);
  });

  it("accepts one non-empty Environment ID immediately after Begin Patch", () => {
    expect(
      parseApplyPatch(
        "*** Begin Patch\n*** Environment ID: env-123\n*** Add File: x.md\n+x\n*** End Patch",
      ),
    ).toEqual({
      ok: true,
      operations: [
        {
          kind: "add",
          filePath: "x.md",
          addedLines: ["x"],
          removedLines: [],
        },
      ],
    });
  });

  it("accepts the host's implicit, context-only, empty, and EOF hunk forms", () => {
    const cases = [
      {
        name: "unprefixed empty context",
        body: "@@\n before\n\n-old\n+new\n after",
        addedLines: ["new"],
        removedLines: ["old"],
      },
      {
        name: "context-only explicit hunk",
        body: "@@\n unchanged",
        addedLines: [],
        removedLines: [],
      },
      {
        name: "empty-context explicit hunk",
        body: "@@\n",
        addedLines: [],
        removedLines: [],
      },
      {
        name: "implicit first hunk",
        body: "-old\n+new",
        addedLines: ["new"],
        removedLines: ["old"],
      },
      {
        name: "new hunk after EOF marker",
        body: "@@\n-old\n+new\n*** End of File\n@@\n+later",
        addedLines: ["new", "later"],
        removedLines: ["old"],
      },
    ] as const;

    for (const testCase of cases) 
      expect
        .soft(
          parseApplyPatch(
            `*** Begin Patch\n*** Update File: x.md\n${testCase.body}\n*** End Patch`,
          ),
          testCase.name,
        )
        .toEqual({
          ok: true,
          operations: [
            {
              kind: "update",
              filePath: "x.md",
              addedLines: testCase.addedLines,
              removedLines: testCase.removedLines,
            },
          ],
        });
    
  });

  it("accepts a bodyless delete as one non-empty operation", () => {
    expect(
      parseApplyPatch(
        "*** Begin Patch\n*** Delete File: gone.ts\n*** End Patch",
      ),
    ).toEqual({
      ok: true,
      operations: [
        {
          kind: "delete",
          filePath: "gone.ts",
          addedLines: [],
          removedLines: [],
        },
      ],
    });
  });

  it("rejects host-invalid update hunk forms", () => {
    const cases = [
      {
        name: "header prefix without a delimiter",
        body: "@@function thing\n-old\n+new",
      },
      { name: "three-at header", body: "@@@\n-old\n+new" },
      {
        name: "body directly after EOF marker",
        body: "@@\n-old\n+new\n*** End of File\n-more\n+later",
      },
      {
        name: "consecutive empty explicit hunks",
        body: "@@\n@@\n-old\n+new",
      },
      { name: "terminal empty explicit hunk", body: "@@\n-old\n+new\n@@" },
    ];

    for (const testCase of cases) {
      const parsed = parseApplyPatch(
        `*** Begin Patch\n*** Update File: x.ts\n${testCase.body}\n*** End Patch`,
      );
      expect.soft(parsed.ok, testCase.name).toBe(false);
    }
  });

  it.each([
    ["missing envelope", "not really a patch"],
    ["zero operations", "*** Begin Patch\n*** End Patch"],
    ["empty target", "*** Begin Patch\n*** Add File:   \n+x\n*** End Patch"],
    [
      "empty Environment ID",
      "*** Begin Patch\n*** Environment ID:   \n*** Add File: x.ts\n+x\n*** End Patch",
    ],
    [
      "duplicate Environment ID",
      "*** Begin Patch\n*** Environment ID: one\n*** Environment ID: two\n*** Add File: x.ts\n+x\n*** End Patch",
    ],
    [
      "Environment ID after a file section",
      "*** Begin Patch\n*** Add File: x.ts\n+x\n*** Environment ID: late\n*** End Patch",
    ],
    [
      "unknown file directive",
      "*** Begin Patch\n*** Replace File: x.ts\n+x\n*** End Patch",
    ],
    [
      "bodyless update",
      "*** Begin Patch\n*** Update File: x.ts\n*** End Patch",
    ],
    [
      "delete with body",
      "*** Begin Patch\n*** Delete File: x.ts\n-old\n*** End Patch",
    ],
    [
      "unsupported move",
      "*** Begin Patch\n*** Update File: a.ts\n*** Move to: b.ts\n@@\n-old\n+new\n*** End Patch",
    ],
    [
      "valid prefix then malformed section",
      "*** Begin Patch\n*** Add File: ok.ts\n+ok\n*** Update File: hidden.ts\n*** End Patch",
    ],
  ])("rejects %s instead of returning an allowed prefix", (_name, patch) => {
    const parsed = parseApplyPatch(patch);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.reason).not.toBe("");
  });
});

describe("normalizeCodexToolUses", () => {
  it("preserves discriminated union sibling fields in its output type", () => {
    type A = {
      tool_name: string;
      tool_input: Record<string, unknown>;
      kind: "a";
      onlyA: string;
    };
    type B = {
      tool_name: string;
      tool_input: Record<string, unknown>;
      kind: "b";
      onlyB: number;
    };
    const readSibling = (out: NormalizedCodexToolUse<A | B>) => {
      if (out.kind === "a") return out.onlyA.toUpperCase();
      return out.onlyB.toFixed();
    };

    expect(
      readSibling({
        tool_name: "Read",
        tool_input: {},
        kind: "a",
        onlyA: "kept",
      }),
    ).toBe("KEPT");
  });

  it("leaves a non-apply_patch tool call untouched", () => {
    const input = { tool_name: "Read", tool_input: { file_path: "a.ts" } };
    const result = normalizeCodexToolUses(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.original).toBe(input);
    expect(result.toolUses[0]).toBe(input);
  });

  it.each(["Write", "Edit"])(
    "leaves a Claude %s and its edit fields untouched",
    (toolName) => {
      const input = {
        session_id: "s1",
        tool_name: toolName,
        tool_input: {
          file_path: "a.ts",
          content: "x",
          old_string: "old",
          new_string: "new",
          sibling: "keep",
        },
      };
      const result = normalizeCodexToolUses(input);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.toolUses[0]).toBe(input);
    },
  );

  it("rewrites an update to Edit with file_path and old/new strings", () => {
    const result = normalizeCodexToolUses({
      tool_name: "apply_patch",
      tool_input: { command: UPDATE_PATCH },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const out = result.toolUses[0];
    expect(out.tool_name).toBe("Edit");
    expect(out.tool_input?.file_path).toBe("/proj/target.txt");
    expect(out.tool_input?.old_string).toBe("sentinel_token");
    expect(out.tool_input?.new_string).toBe("REPLACED");
  });

  it("rewrites an add to Write whose content is the whole file", () => {
    const result = normalizeCodexToolUses({
      tool_name: "apply_patch",
      tool_input: { command: ADD_PATCH },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const out = result.toolUses[0];
    expect(out.tool_name).toBe("Write");
    expect(out.tool_input?.file_path).toBe("/proj/created.txt");
    expect(out.tool_input?.content).toBe("brand new file");
  });

  it("normalizes every file and preserves command plus sibling fields", () => {
    const input = {
      cwd: "/proj",
      session_id: "s1",
      tool_name: "apply_patch",
      tool_input: {
        command:
          "*** Begin Patch\n*** Update File: first.ts\n@@\n-a\n+b\n*** Add File: second.ts\n+hello\n*** Delete File: third.ts\n*** End Patch",
        sibling: "keep",
      },
    };
    const result = normalizeCodexToolUses(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.original).toBe(input);
    expect(result.toolUses.map((toolUse) => toolUse.tool_name)).toEqual([
      "Edit",
      "Write",
      "Delete",
    ]);
    expect(
      result.toolUses.map((toolUse) => toolUse.tool_input?.file_path),
    ).toEqual(["first.ts", "second.ts", "third.ts"]);
    for (const toolUse of result.toolUses) {
      expect(toolUse.cwd).toBe("/proj");
      expect(toolUse.session_id).toBe("s1");
      expect(toolUse.tool_input?.command).toBe(input.tool_input.command);
      expect(toolUse.tool_input?.sibling).toBe("keep");
    }
  });

  it.each([undefined, 42])(
    "rejects apply_patch with missing or non-string command: %s",
    (command) => {
      const result = normalizeCodexToolUses({
        tool_name: "apply_patch",
        tool_input: command === undefined ? {} : { command },
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toContain("command");
    },
  );

  it("returns the parser failure rather than a successful empty batch", () => {
    const result = normalizeCodexToolUses({
      tool_name: "apply_patch",
      tool_input: { command: "not really a patch" },
    });
    expect(result.ok).toBe(false);
  });

  it("does not infer a patch from another tool name", () => {
    const input = {
      tool_name: "custom_patch",
      tool_input: { command: ADD_PATCH },
    };
    const result = normalizeCodexToolUses(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.toolUses[0]).toBe(input);
  });
});
