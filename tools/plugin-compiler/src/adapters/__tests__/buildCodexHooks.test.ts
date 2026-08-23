import { describe, expect, it } from "vitest";

import type { HooksFileSource, PluginFacts } from "../../types/index.js";
import { buildCodexHooks } from "../builders/buildCodexHooks.js";

function facts(hooksFile: HooksFileSource | null): PluginFacts {
  return {
    directory: "/repo/plugins/filid",
    name: "filid",
    manifest: { name: "filid" },
    hasSkills: false,
    agentFiles: {},
    skillFiles: {},
    hasHooks: hooksFile !== null,
    hooksFile,
    mcpServers: null,
  };
}

const READ_MATCHER: HooksFileSource = {
  hooks: {
    PreToolUse: [
      {
        matcher: "Read|Write|Edit",
        hooks: [{ command: "node bridge/pre-tool-use.mjs" }],
      },
    ],
  },
};

describe("buildCodexHooks", () => {
  // --- basic ---

  it("returns null when the plugin has no hooks file", () => {
    expect(buildCodexHooks(facts(null))).toBeNull();
  });

  it("returns null for a `*` matcher (already catches Bash)", () => {
    expect(
      buildCodexHooks(
        facts({ hooks: { PreToolUse: [{ matcher: "*", hooks: [{}] }] } }),
      ),
    ).toBeNull();
  });

  it("appends Bash to a read-catching PreToolUse matcher", () => {
    const built = buildCodexHooks(facts(READ_MATCHER)) as {
      hooks: { PreToolUse: [{ matcher: string }] };
    };
    expect(built.hooks.PreToolUse[0].matcher).toBe("Read|Write|Edit|Bash");
  });

  // --- complex ---

  it("returns null when the matcher does not name Read", () => {
    expect(
      buildCodexHooks(
        facts({ hooks: { PreToolUse: [{ matcher: "Write|Edit" }] } }),
      ),
    ).toBeNull();
  });

  it("returns null when the matcher already lists Bash", () => {
    expect(
      buildCodexHooks(
        facts({ hooks: { PreToolUse: [{ matcher: "Read|Bash" }] } }),
      ),
    ).toBeNull();
  });

  it("preserves the handler commands inside the extended group", () => {
    const built = buildCodexHooks(facts(READ_MATCHER)) as {
      hooks: { PreToolUse: [{ hooks: { command: string }[] }] };
    };
    expect(built.hooks.PreToolUse[0].hooks).toEqual([
      { command: "node bridge/pre-tool-use.mjs" },
    ]);
  });

  it("copies other events unchanged while extending PreToolUse", () => {
    const built = buildCodexHooks(
      facts({
        hooks: {
          SessionStart: [{ matcher: "*", hooks: [{ command: "s" }] }],
          PreToolUse: [{ matcher: "Read|Edit" }],
        },
      }),
    ) as { hooks: Record<string, [{ matcher: string }]> };
    expect(built.hooks.SessionStart[0].matcher).toBe("*");
    expect(built.hooks.PreToolUse[0].matcher).toBe("Read|Edit|Bash");
  });

  it("does not interpret non-tool event matchers as tool capabilities", () => {
    expect(
      buildCodexHooks(
        facts({ hooks: { SessionStart: [{ matcher: "Skill", hooks: [{}] }] } }),
      ),
    ).toBeNull();
  });

  it("filters unsupported events into a dedicated Codex hooks file", () => {
    const built = buildCodexHooks(
      facts({
        hooks: {
          SessionStart: [{ matcher: "*", hooks: [{ command: "s" }] }],
          PostToolUseFailure: [{ matcher: "Bash", hooks: [{ command: "f" }] }],
        },
      }),
    ) as { hooks: Record<string, unknown> };
    expect(built.hooks).toEqual({
      SessionStart: [{ matcher: "*", hooks: [{ command: "s" }] }],
    });
  });

  it("preserves SessionEnd as a supported Codex event", () => {
    expect(
      buildCodexHooks(
        facts({ hooks: { SessionEnd: [{ matcher: "*", hooks: [{}] }] } }),
      ),
    ).toBeNull();
  });

  it("does not extend a Read matcher on a non-PreToolUse event", () => {
    expect(
      buildCodexHooks(facts({ hooks: { PostToolUse: [{ matcher: "Read" }] } })),
    ).toBeNull();
  });

  it("removes a Skill-only group and its empty event on Codex", () => {
    const built = buildCodexHooks(
      facts({ hooks: { PostToolUse: [{ matcher: "Skill", hooks: [{}] }] } }),
    ) as { hooks: Record<string, unknown> };
    expect(built.hooks).not.toHaveProperty("PostToolUse");
  });

  it("keeps supported siblings when removing Skill on Codex", () => {
    const built = buildCodexHooks(
      facts({
        hooks: {
          PostToolUse: [{ matcher: "Bash|Skill", hooks: [{ command: "p" }] }],
        },
      }),
    ) as { hooks: { PostToolUse: [{ matcher: string }] } };
    expect(built.hooks.PostToolUse[0].matcher).toBe("Bash");
  });

  it("never mutates the canonical Claude hook facts", () => {
    const source: HooksFileSource = {
      hooks: { PostToolUse: [{ matcher: "Bash|Skill" }] },
    };
    const before = structuredClone(source);
    buildCodexHooks(facts(source));
    expect(source).toEqual(before);
  });
});
