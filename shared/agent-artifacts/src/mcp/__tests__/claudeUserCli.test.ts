import { describe, expect, it } from "vitest";

import {
  createMcpServerManager,
  type McpCliRunner,
  type McpServerDefinition,
  type McpServerManager,
} from "../index.js";

function createManager(): McpServerManager {
  return createMcpServerManager({
    owner: "example-owner",
    target: { kind: "cli", command: "claude", scope: "user" },
  });
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
      return {
        code: 0,
        stdout: "",
        stderr: "",
        timedOut: false,
      };
    },
  };
}

describe("Claude user MCP CLI adapter", () => {
  it("runs one scoped stdio add with stable env argv", async () => {
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
          "--env",
          "ALPHA=first",
          "--env",
          "ZED=last",
          "owned",
          "--",
          "node",
          "server.js",
          "--verbose",
        ],
      },
    ]);
  });

  it("runs one scoped HTTP add with each header as one argv item", async () => {
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
          "--header",
          "Authorization: Bearer token",
          "--header",
          "Zed: last",
          "remote",
          "https://example.test/mcp",
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
