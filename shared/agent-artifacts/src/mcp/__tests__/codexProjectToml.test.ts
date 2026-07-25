import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parse } from "smol-toml";
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
  env: { API_KEY: "secret" },
};

function createManager(target: FileMcpTarget): McpServerManager {
  return createMcpServerManager({ owner: "example-owner", target });
}

describe("Codex project MCP TOML adapter", () => {
  let root: string;
  let path: string;
  let target: FileMcpTarget;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "agent-mcp-codex-project-"));
    path = join(root, ".codex", "config.toml");
    mkdirSync(join(root, ".codex"));
    target = { kind: "toml-file", root, path, lockTarget: path };
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("adds one owned block without changing comments or unrelated bytes", async () => {
    const original = '# user comment\nmodel = "gpt-5"\n';
    writeFileSync(path, original);
    expect(() => parse(original)).not.toThrow();
    const manager = createManager(target);

    const result = await manager.apply(
      await manager.plan({
        name: "owned",
        definition: SERVER,
        replaceDrift: false,
      }),
    );
    const after = readFileSync(path, "utf8");

    expect(result.ok).toBe(true);
    expect(result.outcomes).toMatchObject([{ action: "copy" }]);
    expect(after.startsWith(original)).toBe(true);
    expect(after).toContain("# OGHAM-MCP:START:");
    expect(after).toContain("# OGHAM-MCP:END:");
    expect(() => parse(after)).not.toThrow();
    expect(
      (parse(after).mcp_servers as Record<string, unknown>).owned,
    ).toMatchObject({ command: "node", args: ["server.js"] });
  });

  it("updates and removes only its marked block", async () => {
    const original = '# keep before\nmodel = "gpt-5"\n';
    writeFileSync(path, original);
    const manager = createManager(target);
    await manager.apply(
      await manager.plan({
        name: "owned",
        definition: SERVER,
        replaceDrift: false,
      }),
    );
    writeFileSync(
      path,
      readFileSync(path, "utf8")
        .replace('command = "node"', 'command = "user-command"')
        .concat("# keep after\n"),
    );

    const drift = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: false,
    });
    expect(drift.outcomes).toMatchObject([{ action: "drift" }]);
    expect((await manager.apply(drift)).ok).toBe(true);
    expect(readFileSync(path, "utf8")).toContain('command = "user-command"');

    const update = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: true,
    });
    expect(update.outcomes).toMatchObject([{ action: "update" }]);
    expect((await manager.apply(update)).ok).toBe(true);
    expect(readFileSync(path, "utf8")).toContain('command = "node"');

    const removal = await manager.plan({
      name: "owned",
      definition: null,
      replaceDrift: false,
    });
    expect((await manager.apply(removal)).ok).toBe(true);
    const after = readFileSync(path, "utf8");
    expect(after).toContain(original);
    expect(after).toContain("# keep after\n");
    expect(after).not.toContain("OGHAM-MCP:");
    expect(() => parse(after)).not.toThrow();
  });

  it("quotes server names and escapes TOML string values", async () => {
    const manager = createManager(target);
    const name = 'team."quoted".server';
    const definition: McpServerDefinition = {
      transport: "http",
      url: 'https://example.test/a"b\\c',
      bearerTokenEnvVar: 'TOKEN_"ONE"',
      headers: { 'X-"Name"': "line\tvalue" },
    };

    expect(
      (
        await manager.apply(
          await manager.plan({
            name,
            definition,
            replaceDrift: false,
          }),
        )
      ).ok,
    ).toBe(true);
    const after = readFileSync(path, "utf8");
    const parsed = parse(after).mcp_servers as Record<string, unknown>;

    expect(parsed[name]).toMatchObject({
      url: definition.url,
      bearer_token_env_var: definition.bearerTokenEnvVar,
      http_headers: definition.headers,
    });
  });

  it("rejects invalid original TOML without writing", async () => {
    writeFileSync(path, "[not valid");
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

  it("refuses a same-name server not enclosed by its owner markers", async () => {
    const original =
      '[mcp_servers."owned"]\ncommand = "user-command"\nargs = []\n';
    writeFileSync(path, original);
    const manager = createManager(target);

    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: true,
    });

    expect(plan.outcomes).toMatchObject([
      { action: "conflict", reason: expect.stringContaining("unowned") },
    ]);
    expect(await manager.apply(plan)).toMatchObject({
      ok: false,
      failure: { kind: "conflict" },
    });
    expect(readFileSync(path, "utf8")).toBe(original);
  });

  it("rejects TOML larger than one MiB", async () => {
    const original = `# ${"x".repeat(1024 * 1024)}\n`;
    writeFileSync(path, original);
    const manager = createManager(target);
    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: false,
    });

    expect(plan.outcomes).toMatchObject([
      { action: "conflict", reason: expect.stringContaining("1 MiB") },
    ]);
    expect((await manager.apply(plan)).failure?.kind).toBe("invalid");
    expect(readFileSync(path, "utf8")).toBe(original);
  });

  it("rejects stale revisions without overwriting user edits", async () => {
    const manager = createManager(target);
    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: false,
    });
    writeFileSync(path, '# later edit\nmodel = "gpt-5"\n');

    expect(await manager.apply(plan)).toMatchObject({
      ok: false,
      outcomes: [{ action: "conflict" }],
      failure: { kind: "conflict" },
    });
    expect(readFileSync(path, "utf8")).toBe('# later edit\nmodel = "gpt-5"\n');
  });

  it("reports a lock conflict without changing the file", async () => {
    const original = 'model = "gpt-5"\n';
    writeFileSync(path, original);
    const manager = createManager(target);
    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: false,
    });
    mkdirSync(`${path}.lock`);

    expect(await manager.apply(plan)).toMatchObject({
      ok: false,
      outcomes: [{ action: "conflict" }],
      failure: { kind: "conflict" },
    });
    expect(readFileSync(path, "utf8")).toBe(original);
  });

  it("renders a parseable empty-file HTTP block", async () => {
    const manager = createManager(target);
    await manager.apply(
      await manager.plan({
        name: "remote",
        definition: {
          transport: "http",
          url: "https://example.test/mcp",
        },
        replaceDrift: false,
      }),
    );

    const after = readFileSync(path, "utf8");
    expect(() => parse(after)).not.toThrow();
    expect(
      (parse(after).mcp_servers as Record<string, unknown>).remote,
    ).toMatchObject({ url: "https://example.test/mcp" });
  });

  it("revalidates a serialized plan before writing TOML", async () => {
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

  it("rejects an unmatched owned end marker before a valid block", async () => {
    const manager = createManager(target);
    await manager.apply(
      await manager.plan({
        name: "owned",
        definition: SERVER,
        replaceDrift: false,
      }),
    );
    const valid = readFileSync(path, "utf8");
    const endMarker = valid
      .split("\n")
      .find((line) => line.startsWith("# OGHAM-MCP:END:"));
    writeFileSync(path, `${endMarker}\n${valid}`);

    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: true,
    });

    expect(plan).toMatchObject({
      outcomes: [{ action: "conflict" }],
      failure: { kind: "invalid" },
    });
  });

  it("rejects an owned marker with trailing text", async () => {
    const manager = createManager(target);
    await manager.apply(
      await manager.plan({
        name: "owned",
        definition: SERVER,
        replaceDrift: false,
      }),
    );
    const valid = readFileSync(path, "utf8");
    const endMarker = valid
      .split("\n")
      .find((line) => line.startsWith("# OGHAM-MCP:END:"));
    writeFileSync(
      path,
      valid.replace(`${endMarker}\n`, `${endMarker}-extra\n`),
    );

    const plan = await manager.plan({
      name: "owned",
      definition: SERVER,
      replaceDrift: true,
    });

    expect(plan).toMatchObject({
      outcomes: [{ action: "conflict" }],
      failure: { kind: "invalid" },
    });
  });
});
