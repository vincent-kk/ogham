import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyFiles } from "../steps/applyFiles.js";
import { planPluginAdapters } from "../steps/planPluginAdapters.js";

/** Temporary canonical fixture, removed after every test. */
let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "compiler-mcp-references-"));
});
afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

/** Write one synthetic source file into the current isolated plugin fixture. */
function write(relativePath: string, content: string): void {
  const target = join(directory, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

/** Seed an owned MCP source and optional exact hook with no external credentials. */
function seed(
  content: string,
  matcher = "mcp__plugin_example_tools__read",
): void {
  write(".claude-plugin/plugin.json", JSON.stringify({ name: "example" }));
  write(
    ".mcp.json",
    JSON.stringify({
      mcpServers: { tools: { command: "node", args: ["bridge/server.cjs"] } },
    }),
  );
  write(
    "hooks/hooks.json",
    JSON.stringify({ hooks: { PostToolUse: [{ matcher }] } }),
  );
  write("skills/run/SKILL.md", content);
  write("skills/run/references/help.md", "KEEP BYTES\r\n");
}

describe("MCP references in generation plans", () => {
  it("reports invalid companion runtime declarations without partial output", () => {
    seed("plain skill");
    write("plugin-compiler.json", '{"codexHookRuntime":"../outside"}');
    const plan = planPluginAdapters(directory);
    expect(plan.files).toEqual([]);
    expect(plan.diagnostics).toContainEqual({
      level: "error",
      code: "codex-hook-runtime",
      message: expect.stringContaining("Codex hook runtime"),
    });
  });

  it("selects prebuilt companions while preserving canonical declarations", () => {
    seed("plain skill", "Bash");
    const hooks = JSON.stringify({
      hooks: {
        PostToolUse: [
          {
            matcher: "Bash",
            hooks: [
              {
                command:
                  'node "${CLAUDE_PLUGIN_ROOT}/bridge/post-tool-use.mjs"',
              },
            ],
          },
        ],
      },
    });
    write("hooks/hooks.json", hooks);
    write("plugin-compiler.json", '{"codexHookRuntime":"bridge/codex"}');
    const plan = planPluginAdapters(directory);
    expect(
      plan.files.find((file) =>
        file.absolutePath.endsWith(".codex-plugin/hooks.json"),
      )?.content,
    ).toContain("bridge/codex/post-tool-use.mjs");
    expect(
      plan.files.some((file) => file.absolutePath.includes("/bridge/")),
    ).toBe(false);
    expect(readFileSync(join(directory, "hooks/hooks.json"), "utf8")).toBe(
      hooks,
    );
    expect(plan.diagnostics).toEqual([]);
  });

  it("returns no partial files for a marker error", () => {
    seed("<!-- ogham-mcp-tools:wrong -->");
    const plan = planPluginAdapters(directory);
    expect(plan.files).toEqual([]);
    expect(plan.diagnostics).toEqual([
      {
        level: "error",
        code: "codex-mcp-tool-reference",
        message: expect.any(String),
      },
    ]);
  });

  it("keeps a matcher error distinct from variable errors", () => {
    seed("<!-- ogham-mcp-tools:example -->", "mcp__plugin_example_tools__.*");
    const plan = planPluginAdapters(directory);
    expect(plan.files).toEqual([]);
    expect(plan.diagnostics[0]?.code).toBe("codex-mcp-hook-matcher");
  });

  it("emits matching manifests and a complete generated skill tree", () => {
    seed("<!-- ogham-mcp-tools:example -->\nmcp__plugin_example_tools__read");
    const plan = planPluginAdapters(directory);
    const root = plan.files.find(
      (file) => file.absolutePath === join(directory, "plugin.json"),
    );
    const dedicated = plan.files.find(
      (file) =>
        file.absolutePath === join(directory, ".codex-plugin/plugin.json"),
    );
    expect(root?.content).toBe(dedicated?.content);
    expect(JSON.parse(root!.content)).toMatchObject({
      skills: "./.codex-plugin/skills/",
      hooks: "./.codex-plugin/hooks.json",
    });
    expect(
      plan.files.find((file) =>
        file.absolutePath.endsWith(join("references", "help.md")),
      )?.content,
    ).toBe("KEEP BYTES\r\n");
    expect(plan.diagnostics).toEqual([]);
  });

  it("regenerates identically and never modifies canonical fixture bytes", () => {
    seed("<!-- ogham-mcp-tools:example -->\nmcp__plugin_example_tools__read");
    const canonical = [
      ".claude-plugin/plugin.json",
      ".mcp.json",
      "hooks/hooks.json",
      "skills/run/SKILL.md",
      "skills/run/references/help.md",
    ];
    const before = canonical.map((path) =>
      readFileSync(join(directory, path), "utf8"),
    );
    const first = planPluginAdapters(directory);
    applyFiles(first.files, false);
    const second = planPluginAdapters(directory);
    expect(second).toEqual(first);
    expect(
      applyFiles(second.files, true).every(
        (outcome) => outcome.action === "unchanged",
      ),
    ).toBe(true);
    expect(
      canonical.map((path) => readFileSync(join(directory, path), "utf8")),
    ).toEqual(before);
  });
});
