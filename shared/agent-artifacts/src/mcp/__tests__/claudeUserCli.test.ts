import { describe, expect, it } from "vitest";

import {
  createMcpServerManager,
  type McpCliRunner,
  type McpCliRunResult,
  type McpServerDefinition,
  type McpServerManager,
} from "../index.js";

function createManager(): McpServerManager {
  return createMcpServerManager({
    owner: "example-owner",
    target: { kind: "cli", command: "claude", scope: "user" },
  });
}

const OK: McpCliRunResult = {
  code: 0,
  stdout: "",
  stderr: "",
  timedOut: false,
};

function existingServer(name: string): McpCliRunResult {
  return {
    code: 1,
    stdout: "",
    stderr: `MCP server ${name} already exists in user config\n`,
    timedOut: false,
  };
}

function missingServer(name: string): McpCliRunResult {
  return {
    code: 1,
    stdout: "",
    stderr: `No MCP server named "${name}" in user scope\n`,
    timedOut: false,
  };
}

function recordingRunner(): {
  readonly calls: Array<{ binary: string; args: readonly string[] }>;
  readonly runner: McpCliRunner;
} {
  const calls: Array<{ binary: string; args: readonly string[] }> = [];
  return {
    calls,
    runner: async (binary, args) => {
      calls.push({ binary, args });
      return OK;
    },
  };
}

describe("Claude user MCP CLI adapter", () => {
  it("puts the stdio name before variadic env options", async () => {
    const manager = createManager();
    const { calls, runner } = recordingRunner();
    const definition: McpServerDefinition = {
      transport: "stdio",
      command: "node",
      args: ["server.js", "--verbose"],
      env: { ZED: "last", ALPHA: "first" },
    };
    const plan = await manager.plan({
      name: "owned",
      definition,
      replaceDrift: true,
    });

    expect(await manager.apply(plan, { runner })).toMatchObject({ ok: true });
    expect(calls).toEqual([
      {
        binary: "claude",
        args: [
          "mcp",
          "add",
          "--scope",
          "user",
          "owned",
          "--env",
          "ALPHA=first",
          "--env",
          "ZED=last",
          "--",
          "node",
          "server.js",
          "--verbose",
        ],
      },
    ]);
  });

  it("puts the HTTP name and URL before variadic header options", async () => {
    const manager = createManager();
    const { calls, runner } = recordingRunner();
    const plan = await manager.plan({
      name: "remote",
      definition: {
        transport: "http",
        url: "https://example.test/mcp",
        headers: { Zed: "last", Authorization: "Bearer token" },
      },
      replaceDrift: false,
    });

    expect(await manager.apply(plan, { runner })).toMatchObject({ ok: true });
    expect(calls).toEqual([
      {
        binary: "claude",
        args: [
          "mcp",
          "add",
          "--scope",
          "user",
          "--transport",
          "http",
          "remote",
          "https://example.test/mcp",
          "--header",
          "Authorization: Bearer token",
          "--header",
          "Zed: last",
        ],
      },
    ]);
  });

  it("runs one scoped remove and does not list or get first", async () => {
    const manager = createManager();
    const { calls, runner } = recordingRunner();
    const plan = await manager.plan({
      name: "owned",
      definition: null,
      replaceDrift: false,
    });

    expect(await manager.apply(plan, { runner })).toMatchObject({ ok: true });
    expect(calls).toEqual([
      {
        binary: "claude",
        args: ["mcp", "remove", "--scope", "user", "owned"],
      },
    ]);
  });

  it("treats removing an already absent server as idempotent success", async () => {
    const manager = createManager();
    const calls: Array<{ binary: string; args: readonly string[] }> = [];
    const runner: McpCliRunner = async (binary, args) => {
      calls.push({ binary, args });
      return missingServer("owned");
    };
    const plan = await manager.plan({
      name: "owned",
      definition: null,
      replaceDrift: false,
    });

    expect(await manager.apply(plan, { runner })).toMatchObject({ ok: true });
    expect(calls).toEqual([
      {
        binary: "claude",
        args: ["mcp", "remove", "--scope", "user", "owned"],
      },
    ]);
  });

  it("reapplies idempotently and replaces drift when requested", async () => {
    const manager = createManager();
    const calls: Array<{ binary: string; args: readonly string[] }> = [];
    let installed: readonly string[] | null = null;
    const runner: McpCliRunner = async (binary, args) => {
      calls.push({ binary, args });
      if (args[1] === "add") {
        if (installed !== null) return existingServer("owned");
        installed = args;
        return OK;
      }
      if (installed === null) return missingServer("owned");
      installed = null;
      return OK;
    };
    const initial = await manager.plan({
      name: "owned",
      definition: {
        transport: "stdio",
        command: "node",
        args: ["first.js"],
      },
      replaceDrift: false,
    });

    expect(await manager.apply(initial, { runner })).toMatchObject({
      ok: true,
    });
    expect(await manager.apply(initial, { runner })).toMatchObject({
      ok: true,
    });

    const replacement = await manager.plan({
      name: "owned",
      definition: {
        transport: "stdio",
        command: "node",
        args: ["replacement.js"],
      },
      replaceDrift: true,
    });
    expect(await manager.apply(replacement, { runner })).toMatchObject({
      ok: true,
    });
    expect(calls.map(({ args }) => args[1])).toEqual([
      "add",
      "add",
      "add",
      "remove",
      "add",
    ]);
    expect(installed).toEqual([
      "mcp",
      "add",
      "--scope",
      "user",
      "owned",
      "--",
      "node",
      "replacement.js",
    ]);
  });

  it("does not spawn while inspecting or planning", async () => {
    const manager = createManager();
    const { calls, runner } = recordingRunner();

    await expect(manager.inspect("owned")).resolves.toMatchObject([
      { id: "owned", action: "unsupported", target: "claude mcp" },
    ]);
    await manager.plan({
      name: "owned",
      definition: {
        transport: "stdio",
        command: "node",
      },
      replaceDrift: false,
    });

    expect(calls).toEqual([]);
    expect(runner).toBeTypeOf("function");
  });
});
