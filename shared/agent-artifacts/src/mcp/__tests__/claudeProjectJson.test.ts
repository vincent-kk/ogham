import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createMcpServerManager,
  type McpServerDefinition,
  type McpServerManager,
} from "../index.js";
import type { FileMcpTarget } from "../../targets/index.js";

const SERVER: McpServerDefinition = {
  transport: "stdio",
  command: "node",
  args: ["server.js"],
  env: { TOKEN: "one" },
};

function createManager(target: FileMcpTarget): McpServerManager {
  return createMcpServerManager({ owner: "example-owner", target });
}

describe("Claude project MCP JSON adapter", () => {
  let root: string;
  let path: string;
  let target: FileMcpTarget;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agent-mcp-claude-project-"));
    path = join(root, ".mcp.json");
    target = { kind: "json-file", root, path, lockTarget: path };
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("adds one server while preserving unrelated keys and servers", async () => {
    writeFileSync(
      path,
      JSON.stringify({
        version: 2,
        feature: { enabled: true },
        mcpServers: { other: { command: "other" } },
      }),
    );
    const manager = createManager(target);

    const result = await manager.apply(
      await manager.plan({
        name: "owned",
        definition: SERVER,
        replaceDrift: false,
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.outcomes).toMatchObject([{ id: "owned", action: "copy" }]);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      version: 2,
      feature: { enabled: true },
      mcpServers: {
        other: { command: "other" },
        owned: {
          command: "node",
          args: ["server.js"],
          env: { TOKEN: "one" },
        },
      },
    });
  });

  it("reports an exact existing server as unchanged", async () => {
    writeFileSync(
      path,
      JSON.stringify({
        mcpServers: {
          owned: {
            command: "node",
            args: ["server.js"],
            env: { TOKEN: "one" },
          },
        },
      }),
    );
    const manager = createManager(target);
    const before = readFileSync(path, "utf8");

    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: false,
    });
    const result = await manager.apply(plan);

    expect(plan.outcomes).toMatchObject([{ id: "owned", action: "unchanged" }]);
    expect(result.ok).toBe(true);
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("preserves drift unless replacement is explicit", async () => {
    writeFileSync(
      path,
      JSON.stringify({
        mcpServers: { owned: { command: "user-command", args: ["keep"] } },
      }),
    );
    const manager = createManager(target);
    const before = readFileSync(path, "utf8");

    const drift = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: false,
    });
    expect(drift.outcomes).toMatchObject([{ action: "drift" }]);
    expect((await manager.apply(drift)).ok).toBe(true);
    expect(readFileSync(path, "utf8")).toBe(before);

    const replacement = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: true,
    });
    expect(replacement.outcomes).toMatchObject([{ action: "update" }]);
    expect((await manager.apply(replacement)).ok).toBe(true);
    expect(
      JSON.parse(readFileSync(path, "utf8")).mcpServers.owned.command,
    ).toBe("node");
  });

  it("removes only the selected server", async () => {
    writeFileSync(
      path,
      JSON.stringify({
        keep: "top-level",
        mcpServers: {
          other: { command: "other" },
          owned: { command: "node", args: ["server.js"] },
        },
      }),
    );
    const manager = createManager(target);
    const result = await manager.apply(
      await manager.plan({
        name: "owned",
        definition: null,
        replaceDrift: false,
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.outcomes).toMatchObject([{ action: "remove" }]);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      keep: "top-level",
      mcpServers: { other: { command: "other" } },
    });
  });

  it("rejects invalid JSON without replacing the file", async () => {
    writeFileSync(path, "{ definitely not json");
    const manager = createManager(target);
    const before = readFileSync(path, "utf8");
    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: true,
    });

    expect(plan.outcomes).toMatchObject([{ action: "conflict" }]);
    expect(await manager.apply(plan)).toMatchObject({
      ok: false,
      failure: { kind: "invalid", code: null },
    });
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("rejects a stale plan without overwriting a later edit", async () => {
    const manager = createManager(target);
    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: false,
    });
    writeFileSync(path, JSON.stringify({ userEdit: true }));

    expect(await manager.apply(plan)).toMatchObject({
      ok: false,
      outcomes: [{ action: "conflict" }],
      failure: { kind: "conflict", code: null },
    });
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      userEdit: true,
    });
  });

  it("requires a name selector when inspecting", async () => {
    writeFileSync(
      path,
      JSON.stringify({ mcpServers: { owned: { command: "node" } } }),
    );
    const manager = createManager(target);

    await expect(manager.inspect("owned")).resolves.toMatchObject([
      { id: "owned", action: "unchanged", target: path },
    ]);
  });

  it("writes HTTP definitions in Claude's project JSON shape", async () => {
    const manager = createManager(target);
    await manager.apply(
      await manager.plan({
        name: "remote",
        definition: {
          transport: "http",
          url: "https://example.test/mcp",
          headers: { Authorization: "Bearer token" },
        },
        replaceDrift: false,
      }),
    );

    expect(JSON.parse(readFileSync(path, "utf8")).mcpServers.remote).toEqual({
      type: "http",
      url: "https://example.test/mcp",
      headers: { Authorization: "Bearer token" },
    });
  });

  it("revalidates a serialized plan before writing JSON", async () => {
    const manager = createManager(target);
    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: false,
    });

    expect(
      await manager.apply({
        ...plan,
        request: { ...plan.request, name: "bad\nname" },
      }),
    ).toMatchObject({
      ok: false,
      failure: { kind: "invalid" },
    });
    expect(() => readFileSync(path, "utf8")).toThrow();
  });

  it("adds __proto__ as an own server key without prototype mutation", async () => {
    const manager = createManager(target);
    const plan = await manager.plan({
      name: "__proto__",
      definition: SERVER,
      replaceDrift: false,
    });

    expect(plan.outcomes).toMatchObject([{ action: "copy" }]);
    expect((await manager.apply(plan)).ok).toBe(true);
    const servers = JSON.parse(readFileSync(path, "utf8")).mcpServers as Record<
      string,
      unknown
    >;
    expect(Object.prototype.hasOwnProperty.call(servers, "__proto__")).toBe(
      true,
    );
    expect(servers.__proto__).toMatchObject({ command: "node" });
  });
});
