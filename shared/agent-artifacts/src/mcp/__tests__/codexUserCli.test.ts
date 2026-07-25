import { describe, expect, it } from "vitest";

import {
  createMcpServerManager,
  type McpCliRunner,
  type McpCliRunResult,
  type McpServerManager,
} from "../index.js";

function createManager(): McpServerManager {
  return createMcpServerManager({
    owner: "example-owner",
    target: { kind: "cli", command: "codex", scope: "user" },
  });
}

function resultRunner(result: McpCliRunResult): {
  readonly calls: Array<{ binary: string; args: readonly string[] }>;
  readonly runner: McpCliRunner;
} {
  const calls: Array<{ binary: string; args: readonly string[] }> = [];
  return {
    calls,
    runner: async (binary, args) => {
      calls.push({ binary, args });
      return result;
    },
  };
}

const OK: McpCliRunResult = {
  code: 0,
  stdout: "",
  stderr: "",
  timedOut: false,
};

describe("Codex user MCP CLI adapter", () => {
  it("runs one stdio add with exact argv", async () => {
    const manager = createManager();
    const { calls, runner } = resultRunner(OK);
    const plan = await manager.plan({
      name: "owned",
      definition: {
        transport: "stdio",
        command: "node",
        args: ["server.js"],
        env: { ZED: "last", ALPHA: "first" },
      },
      replaceDrift: true,
    });

    expect(await manager.apply(plan, { runner })).toMatchObject({ ok: true });
    expect(calls).toEqual([
      {
        binary: "codex",
        args: [
          "mcp",
          "add",
          "owned",
          "--env",
          "ALPHA=first",
          "--env",
          "ZED=last",
          "--",
          "node",
          "server.js",
        ],
      },
    ]);
  });

  it("runs one HTTP add with bearer env argv", async () => {
    const manager = createManager();
    const { calls, runner } = resultRunner(OK);
    const plan = await manager.plan({
      name: "remote",
      definition: {
        transport: "http",
        url: "https://example.test/mcp",
        bearerTokenEnvVar: "MCP_TOKEN",
      },
      replaceDrift: false,
    });

    expect(await manager.apply(plan, { runner })).toMatchObject({ ok: true });
    expect(calls).toEqual([
      {
        binary: "codex",
        args: [
          "mcp",
          "add",
          "remote",
          "--url",
          "https://example.test/mcp",
          "--bearer-token-env-var",
          "MCP_TOKEN",
        ],
      },
    ]);
  });

  it("runs one remove and does not query existing state", async () => {
    const manager = createManager();
    const { calls, runner } = resultRunner(OK);
    const plan = await manager.plan({
      name: "owned",
      definition: null,
      replaceDrift: false,
    });

    expect(await manager.apply(plan, { runner })).toMatchObject({ ok: true });
    expect(calls).toEqual([
      { binary: "codex", args: ["mcp", "remove", "owned"] },
    ]);
  });

  it("classifies a missing executable without losing stderr", async () => {
    const manager = createManager();
    const missing = Object.assign(new Error("missing"), { code: "ENOENT" });
    const { runner } = resultRunner({
      code: null,
      stdout: "",
      stderr: "not found",
      timedOut: false,
      spawnError: missing,
    });
    const plan = await manager.plan({
      name: "owned",
      definition: null,
      replaceDrift: false,
    });

    expect(await manager.apply(plan, { runner })).toMatchObject({
      ok: false,
      failure: {
        kind: "not-installed",
        code: null,
        stderr: "not found",
      },
    });
  });

  it("classifies spawn, timeout, exit, and thrown runner failures", async () => {
    const manager = createManager();
    const plan = await manager.plan({
      name: "owned",
      definition: null,
      replaceDrift: false,
    });
    const spawn = resultRunner({
      code: null,
      stdout: "",
      stderr: "spawn failed",
      timedOut: false,
      spawnError: new Error("spawn"),
    });
    const timeout = resultRunner({
      code: null,
      stdout: "",
      stderr: "timed out",
      timedOut: true,
    });
    const exit = resultRunner({
      code: 9,
      stdout: "",
      stderr: "bad exit",
      timedOut: false,
    });
    const thrown: McpCliRunner = async () => {
      throw new Error("runner exploded");
    };

    expect(
      (await manager.apply(plan, { runner: spawn.runner })).failure,
    ).toEqual({ kind: "spawn", code: null, stderr: "spawn failed" });
    expect(
      (await manager.apply(plan, { runner: timeout.runner })).failure,
    ).toEqual({ kind: "timeout", code: null, stderr: "timed out" });
    expect(
      (await manager.apply(plan, { runner: exit.runner })).failure,
    ).toEqual({
      kind: "exit",
      code: 9,
      stderr: "bad exit",
    });
    expect((await manager.apply(plan, { runner: thrown })).failure).toEqual({
      kind: "spawn",
      code: null,
      stderr: "runner exploded",
    });
  });

  it("does not call a runner during plan", async () => {
    const manager = createManager();
    const { calls } = resultRunner(OK);

    await manager.plan({
      name: "owned",
      definition: {
        transport: "stdio",
        command: "node",
      },
      replaceDrift: false,
    });

    expect(calls).toEqual([]);
  });

  it("revalidates a serialized plan before executing its argv", async () => {
    const manager = createManager();
    const { calls, runner } = resultRunner(OK);
    const plan = await manager.plan({
      name: "owned",
      definition: null,
      replaceDrift: false,
    });

    expect(
      await manager.apply(
        {
          ...plan,
          request: { ...plan.request, name: "--malicious-option" },
        },
        { runner },
      ),
    ).toMatchObject({
      ok: false,
      failure: { kind: "invalid" },
    });
    expect(calls).toEqual([]);
  });

  it("does not map an unknown CLI command to Codex", () => {
    expect(() =>
      createMcpServerManager({
        owner: "example-owner",
        target: {
          kind: "cli",
          command: "other" as "codex",
          scope: "user",
        },
      }),
    ).toThrow("Unsupported MCP target");
  });
});
