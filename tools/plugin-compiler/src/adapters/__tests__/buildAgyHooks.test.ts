import { describe, expect, it } from "vitest";

import type { HooksFileSource, PluginFacts } from "../../types/index.js";
import { buildAgyHooks } from "../builders/buildAgyHooks.js";

function facts(hooksFile: HooksFileSource | null): PluginFacts {
  return {
    directory: "/repo/plugins/filid",
    name: "filid",
    manifest: { name: "filid" },
    hasSkills: false,
    hasHooks: hooksFile !== null,
    hooksFile,
    mcpServers: null,
  };
}

const CLAUDE_PRE_TOOL_USE: HooksFileSource = {
  hooks: {
    PreToolUse: [
      {
        matcher: "Read|Write|Edit",
        hooks: [
          {
            command:
              'node "${CLAUDE_PLUGIN_ROOT}/libs/run.cjs" "${CLAUDE_PLUGIN_ROOT}/bridge/pre-tool-use.mjs"',
          },
        ],
      },
    ],
  },
};

describe("buildAgyHooks", () => {
  // --- basic ---

  it("returns null when the plugin has no hooks file", () => {
    expect(buildAgyHooks(facts(null))).toBeNull();
  });

  it("returns null when the plugin declares no PreToolUse hook", () => {
    const built = buildAgyHooks(
      facts({ hooks: { SessionStart: [{ matcher: "*", hooks: [{}] }] } }),
    );
    expect(built).toBeNull();
  });

  it("emits a named group keyed by the plugin name", () => {
    const built = buildAgyHooks(facts(CLAUDE_PRE_TOOL_USE));
    expect(Object.keys(built ?? {})).toEqual(["filid"]);
  });

  // --- complex ---

  it("routes the handler through run-agy.mjs with the extracted bridge path", () => {
    const built = buildAgyHooks(facts(CLAUDE_PRE_TOOL_USE));
    expect(built).toEqual({
      filid: {
        PreToolUse: [
          {
            matcher: "*",
            hooks: [
              {
                type: "command",
                command: "node bridge/run-agy.mjs PreToolUse bridge/pre-tool-use.mjs",
              },
            ],
          },
        ],
      },
    });
  });

  it("uses `*` matcher rather than translating the Claude tool regex", () => {
    const built = buildAgyHooks(facts(CLAUDE_PRE_TOOL_USE)) as {
      filid: { PreToolUse: [{ matcher: string }] };
    };
    expect(built.filid.PreToolUse[0].matcher).toBe("*");
  });

  it("omits timeout so agy's default (30s) covers the extra runner spawn hop", () => {
    const built = buildAgyHooks(facts(CLAUDE_PRE_TOOL_USE)) as {
      filid: { PreToolUse: [{ hooks: [Record<string, unknown>] }] };
    };
    expect(built.filid.PreToolUse[0].hooks[0]).not.toHaveProperty("timeout");
  });

  it("flattens multiple PreToolUse groups and handler commands", () => {
    const built = buildAgyHooks(
      facts({
        hooks: {
          PreToolUse: [
            {
              matcher: "Write",
              hooks: [
                { command: 'node "${CLAUDE_PLUGIN_ROOT}/bridge/guard-a.mjs"' },
                { command: "node ${CLAUDE_PLUGIN_ROOT}/bridge/guard-b.mjs" },
              ],
            },
            {
              matcher: "Edit",
              hooks: [{ command: "node bridge/guard-c.mjs" }],
            },
          ],
        },
      }),
    ) as { filid: { PreToolUse: [{ hooks: { command: string }[] }] } };
    expect(built.filid.PreToolUse[0].hooks.map((h) => h.command)).toEqual([
      "node bridge/run-agy.mjs PreToolUse bridge/guard-a.mjs",
      "node bridge/run-agy.mjs PreToolUse bridge/guard-b.mjs",
      "node bridge/run-agy.mjs PreToolUse bridge/guard-c.mjs",
    ]);
  });

  it("returns null when a PreToolUse group carries no bridge handler", () => {
    const built = buildAgyHooks(
      facts({
        hooks: { PreToolUse: [{ matcher: "*", hooks: [{ command: "true" }] }] },
      }),
    );
    expect(built).toBeNull();
  });
});
