import { describe, expect, it } from "vitest";
import { buildCodexHooks, buildCodexPluginManifest } from "../index.js";
import { mcpToolFacts } from "./fixtures/mcpToolFacts.js";

const source =
  'node "${CLAUDE_PLUGIN_ROOT}/libs/run.cjs" "${CLAUDE_PLUGIN_ROOT}/bridge/setup.mjs" --flag';

/**
 * Construct inert inputs whose sole Codex adaptation is a runtime directory.
 * @param runtime Optional build-time directory declaration.
 * @returns Anonymous canonical inputs without MCP or persona marker selection.
 */
function facts(runtime?: string) {
  return {
    ...mcpToolFacts({
      skillFiles: {},
      hooksFile: {
        hooks: {
          SessionStart: [{ matcher: "*", hooks: [{ command: source }] }],
        },
      },
    }),
    ...(runtime === undefined ? {} : { codexHookRuntime: runtime }),
  };
}

describe("explicit Codex hook runtimes", () => {
  it("selects a prebuilt companion without changing wrappers or canonical inputs", () => {
    const canonical = facts("bridge/codex");
    const before = structuredClone(canonical);
    expect(buildCodexHooks(canonical)).toMatchObject({
      hooks: {
        SessionStart: [
          {
            hooks: [
              {
                command: source.replace(
                  "bridge/setup.mjs",
                  "bridge/codex/setup.mjs",
                ),
              },
            ],
          },
        ],
      },
    });
    expect(canonical).toEqual(before);
    expect(buildCodexPluginManifest(canonical).hooks).toBe(
      "./.codex-plugin/hooks.json",
    );
  });

  it("leaves plugins without an explicit declaration unchanged", () => {
    expect(buildCodexHooks(facts())).toBeNull();
    expect(buildCodexPluginManifest(facts()).hooks).toBe("./hooks/hooks.json");
  });

  it("preserves unrelated commands and paths outside the canonical bridge basename", () => {
    const canonical = facts("bridge/codex");
    canonical.hooksFile!.hooks!.SessionStart[0].hooks = [
      { command: "node bridge/setup.mjs" },
      { command: 'node "${CLAUDE_PLUGIN_ROOT}/bridge/nested/setup.mjs"' },
      { command: 'node "${CLAUDE_PLUGIN_ROOT}/bridge/setup.mjs.backup"' },
    ];
    expect(buildCodexHooks(canonical)).toBeNull();
  });

  it.each([
    "../outside",
    "/absolute",
    "bridge/../codex",
    "bridge/codex/",
    "bridge/codex;echo",
  ])("rejects unsafe or ambiguous directory %s", (runtime) => {
    expect(() => buildCodexHooks(facts(runtime))).toThrow(/hook runtime/);
  });

  it("composes command rewriting with exact owned MCP matcher adaptation", () => {
    const canonical = { ...mcpToolFacts(), codexHookRuntime: "bridge/codex" };
    canonical.hooksFile!.hooks!.PostToolUse[0].hooks = [{ command: source }];
    const generated = JSON.stringify(buildCodexHooks(canonical));
    expect(generated).toContain("Bash|mcp__seiri__workflow");
    expect(generated).toContain("bridge/codex/setup.mjs");
  });
});
