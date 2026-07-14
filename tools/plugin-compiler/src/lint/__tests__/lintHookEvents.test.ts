import { describe, expect, it } from "vitest";

import type { HooksFileSource, PluginFacts } from "../../types/index.js";
import { lintHookEvents } from "../checks/lintHookEvents.js";

function facts(hooksFile: HooksFileSource | null): PluginFacts {
  return {
    directory: "/repo/plugins/maencof",
    name: "maencof",
    manifest: { name: "maencof" },
    hasSkills: false,
    hasHooks: hooksFile !== null,
    hooksFile,
    mcpServers: null,
  };
}

describe("lintHookEvents", () => {
  // --- basic ---

  it("stays silent when the plugin has no hooks", () => {
    expect(lintHookEvents(facts(null))).toEqual([]);
  });

  it("stays silent for events Codex understands", () => {
    expect(
      lintHookEvents(facts({ hooks: { SessionStart: [], PreToolUse: [] } })),
    ).toEqual([]);
  });

  it("warns on an event outside the Codex set", () => {
    const [diagnostic] = lintHookEvents(facts({ hooks: { SessionEnd: [] } }));
    expect(diagnostic).toMatchObject({
      level: "warning",
      code: "codex-unknown-event",
    });
  });

  // --- complex ---

  it("names the plugin and the event in the message", () => {
    const [diagnostic] = lintHookEvents(facts({ hooks: { Notification: [] } }));
    expect(diagnostic.message).toContain("maencof");
    expect(diagnostic.message).toContain("Notification");
  });

  it("reports one diagnostic per unknown event", () => {
    const diagnostics = lintHookEvents(
      facts({ hooks: { SessionEnd: [], Notification: [], Stop: [] } }),
    );
    expect(diagnostics).toHaveLength(2);
  });

  it("treats an empty hooks object as clean", () => {
    expect(lintHookEvents(facts({ hooks: {} }))).toEqual([]);
  });

  it("tolerates a hooks file with no hooks key", () => {
    expect(lintHookEvents(facts({}))).toEqual([]);
  });
});
