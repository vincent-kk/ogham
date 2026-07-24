import { describe, expect, it } from "vitest";

import type { HooksFileSource, PluginFacts } from "../../types/index.js";
import { lintHookMatchers } from "../checks/lintHookMatchers.js";

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

describe("lintHookMatchers", () => {
  // --- basic ---

  it("stays silent when the plugin has no hooks", () => {
    expect(lintHookMatchers(facts(null))).toEqual([]);
  });

  it("stays silent for a Write-only matcher", () => {
    expect(
      lintHookMatchers(
        facts({ hooks: { PreToolUse: [{ matcher: "Write" }] } }),
      ),
    ).toEqual([]);
  });

  it("warns when Read appears in a PreToolUse matcher", () => {
    const [diagnostic] = lintHookMatchers(
      facts({ hooks: { PreToolUse: [{ matcher: "Read|Write|Edit" }] } }),
    );
    expect(diagnostic).toMatchObject({
      level: "warning",
      code: "codex-read-matcher",
    });
  });

  // --- complex ---

  it("warns on PostToolUse matchers too", () => {
    const diagnostics = lintHookMatchers(
      facts({ hooks: { PostToolUse: [{ matcher: "Read" }] } }),
    );
    expect(diagnostics).toHaveLength(1);
  });

  it("does not treat a Read-prefixed tool name as a Read matcher", () => {
    expect(
      lintHookMatchers(
        facts({ hooks: { PreToolUse: [{ matcher: "ReadNotebook" }] } }),
      ),
    ).toEqual([]);
  });

  it("reports one diagnostic per offending matcher group", () => {
    const diagnostics = lintHookMatchers(
      facts({
        hooks: {
          PreToolUse: [{ matcher: "Read" }, { matcher: "Edit" }],
          PostToolUse: [{ matcher: "Read|Write" }],
        },
      }),
    );
    expect(diagnostics).toHaveLength(2);
  });

  it("ignores matcher-less groups", () => {
    expect(lintHookMatchers(facts({ hooks: { PreToolUse: [{}] } }))).toEqual(
      [],
    );
  });

  it("ignores events that take no tool matcher", () => {
    expect(
      lintHookMatchers(
        facts({ hooks: { SessionStart: [{ matcher: "Read" }] } }),
      ),
    ).toEqual([]);
  });
});
