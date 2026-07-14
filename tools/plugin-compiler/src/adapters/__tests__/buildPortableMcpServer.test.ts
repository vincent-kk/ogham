import { describe, expect, it } from "vitest";

import { HOST_MARKERS } from "../../constants/hosts.js";
import type { McpServerSource } from "../../types/index.js";
import { buildPortableMcpServer } from "../utils/buildPortableMcpServer.js";

function source(overrides: Partial<McpServerSource> = {}): McpServerSource {
  return {
    command: "node",
    args: ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"],
    ...overrides,
  };
}

describe("buildPortableMcpServer", () => {
  // --- basic ---

  it("relativizes args against the plugin root", () => {
    expect(buildPortableMcpServer(source(), HOST_MARKERS.codex).args).toEqual([
      "bridge/mcp-server.cjs",
    ]);
  });

  it("injects the host marker env", () => {
    expect(buildPortableMcpServer(source(), HOST_MARKERS.agy).env).toEqual({
      OGHAM_HOST: "agy",
    });
  });

  it("keeps the command verbatim", () => {
    expect(buildPortableMcpServer(source(), HOST_MARKERS.codex).command).toBe(
      "node",
    );
  });

  // --- complex ---

  it("preserves existing env entries alongside the marker", () => {
    const built = buildPortableMcpServer(
      source({ env: { LOG_LEVEL: "debug" } }),
      HOST_MARKERS.codex,
    );
    expect(built.env).toEqual({ LOG_LEVEL: "debug", OGHAM_HOST: "codex" });
  });

  it("lets the marker win over a stale OGHAM_HOST value", () => {
    const built = buildPortableMcpServer(
      source({ env: { OGHAM_HOST: "claude" } }),
      HOST_MARKERS.codex,
    );
    expect(built.env?.OGHAM_HOST).toBe("codex");
  });

  it("throws when the command uses the plugin-root variable", () => {
    expect(() =>
      buildPortableMcpServer(
        source({ command: "${CLAUDE_PLUGIN_ROOT}/bin/run" }),
        HOST_MARKERS.codex,
      ),
    ).toThrow(/command must not use/);
  });

  it("throws when an env value uses the plugin-root variable", () => {
    expect(() =>
      buildPortableMcpServer(
        source({ env: { DATA: "${CLAUDE_PLUGIN_ROOT}/data" } }),
        HOST_MARKERS.agy,
      ),
    ).toThrow(/env values must not use/);
  });

  it("handles a server with no env and no variable args", () => {
    const built = buildPortableMcpServer(
      source({ args: ["--stdio"] }),
      HOST_MARKERS.agy,
    );
    expect(built).toEqual({
      command: "node",
      args: ["--stdio"],
      env: { OGHAM_HOST: "agy" },
    });
  });
});
