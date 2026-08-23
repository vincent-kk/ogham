import { describe, expect, it } from "vitest";

import { normalizeCodexToolUses } from "../normalizeToolUse.js";

/** Build one Codex apply_patch hook input for normalization. */
function moveInput(command: string) {
  return {
    tool_name: "apply_patch",
    tool_input: { command },
    session_id: "move-provenance-test",
  };
}

describe("normalizeCodexToolUses Move provenance", () => {
  it("keeps both path effects without presenting delta content as complete", () => {
    const normalized = normalizeCodexToolUses(
      moveInput(
        "*** Begin Patch\n*** Update File: src/old.ts\n*** Move to: src/new.ts\n@@\n-old\n+new\n*** End Patch",
      ),
    );

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.toolUses).toHaveLength(2);
    expect(normalized.toolUses[0].codexPatch).toEqual({
      kind: "move",
      role: "source",
      sourcePath: "src/old.ts",
      destinationPath: "src/new.ts",
      addedLines: ["new"],
      removedLines: ["old"],
      sourceChangedEarlier: false,
    });
    expect(normalized.toolUses[1].codexPatch).toEqual({
      kind: "move",
      role: "destination",
      sourcePath: "src/old.ts",
      destinationPath: "src/new.ts",
      addedLines: ["new"],
      removedLines: ["old"],
      sourceChangedEarlier: false,
    });
    expect(normalized.toolUses[1].tool_input).toEqual({
      command: expect.any(String),
      file_path: "src/new.ts",
    });
  });

  it("marks a Move whose source was changed earlier in the physical patch", () => {
    const normalized = normalizeCodexToolUses(
      moveInput(
        "*** Begin Patch\n*** Update File: src/old.ts\n@@\n-before\n+after\n*** Update File: src/old.ts\n*** Move to: src/new.ts\n*** End Patch",
      ),
    );

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.toolUses[1].codexPatch).toMatchObject({
      kind: "move",
      role: "source",
      sourceChangedEarlier: true,
    });
    expect(normalized.toolUses[2].codexPatch).toMatchObject({
      kind: "move",
      role: "destination",
      sourceChangedEarlier: true,
    });
  });
});
