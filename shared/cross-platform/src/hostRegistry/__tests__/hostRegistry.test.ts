import { describe, expect, it } from "vitest";
import { hostFromMarker } from "../hostFromMarker.js";
import { HOSTS } from "../registry.js";
import { resolveHostDescriptor } from "../resolveHostDescriptor.js";

describe("hostFromMarker", () => {
  it("treats an absent marker as claude — Claude ships its .mcp.json unmodified", () => {
    expect(hostFromMarker(undefined)).toBe("claude");
    expect(hostFromMarker("")).toBe("claude");
  });

  it("resolves every marker the table declares back to its own key", () => {
    for (const [id, descriptor] of Object.entries(HOSTS))
      if (descriptor.marker) expect(hostFromMarker(descriptor.marker)).toBe(id);
  });

  it("resolves an unrecognised marker to unknown, not claude", () => {
    // Assuming the Claude contract on a host that does not honour it is the exact
    // silent misbehaviour the registry exists to prevent.
    expect(hostFromMarker("some-future-host")).toBe("unknown");
  });
});

describe("resolveHostDescriptor", () => {
  it("returns the claude channel when neither signal is present", () => {
    const d = resolveHostDescriptor({});
    expect(d.stateRootEnv).toBe("CLAUDE_CONFIG_DIR");
    expect(d.stateRootDir).toBe(".claude");
  });

  it("identifies codex from the hook signal alone (hooks receive no marker)", () => {
    const d = resolveHostDescriptor({
      PLUGIN_DATA: "/somewhere/plugins/data/x",
    });
    expect(d.stateRootDir).toBe(".codex");
    expect(d.stateRootEnv).toBe("CODEX_HOME");
  });

  it("identifies codex from the marker alone (MCP receives no hook signal)", () => {
    expect(resolveHostDescriptor({ OGHAM_HOST: "codex" }).stateRootDir).toBe(
      ".codex",
    );
  });

  it("lets a marker suppress the hook-signal pass", () => {
    // A marker is a statement, a hook signal is an inference. The two never
    // disagree in practice, and they must not be able to combine into a host
    // neither of them named.
    expect(
      resolveHostDescriptor({ OGHAM_HOST: "agy", PLUGIN_DATA: "/x" })
        .stateRootDir,
    ).toBe(HOSTS.agy.stateRootDir);
  });

  it("lands an unrecognised marker on the claude channel without sniffing further", () => {
    const d = resolveHostDescriptor({
      OGHAM_HOST: "some-future-host",
      PLUGIN_DATA: "/x",
    });
    expect(d.stateRootDir).toBe(".claude");
  });
});

describe("HOSTS table", () => {
  it("gives claude no hook signal — measured: Claude injects only CLAUDE_-prefixed vars", () => {
    // A --plugin-dir SessionStart probe returned CLAUDE_PLUGIN_ROOT and
    // CLAUDE_PLUGIN_DATA and no un-prefixed pair. Were Claude to set an
    // un-prefixed PLUGIN_DATA, reading it as "this is Codex" would route Claude's
    // own state to ~/.codex — breaking the no-regression rule this tree rests on.
    expect(HOSTS.claude.hookSignalEnv).toBeUndefined();
    expect(HOSTS.codex.hookSignalEnv).toBe("PLUGIN_DATA");
  });

  it("makes agy's borrowed channel an explicit row, not a missing branch", () => {
    // agy has no measured state directory. Borrowing claude's is the conservative
    // choice; the row exists so the choice is visible and revisable in one place.
    expect(HOSTS.agy.stateRootEnv).toBe(HOSTS.claude.stateRootEnv);
    expect(HOSTS.agy.stateRootDir).toBe(HOSTS.claude.stateRootDir);
    expect(HOSTS.agy.hookSignalEnv).toBeUndefined();
  });

  it("describes only identified hosts — 'unknown' is not a row", () => {
    expect(Object.keys(HOSTS)).not.toContain("unknown");
    expect(HOSTS.claude.marker).toBeUndefined();
  });
});
