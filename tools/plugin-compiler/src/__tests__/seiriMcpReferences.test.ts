import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildCodexHooks,
  buildCodexPluginManifest,
  buildCodexSkills,
} from "../adapters/index.js";
import type { PluginFacts } from "../types/index.js";

const SEIRI_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../plugins/seiri",
);

/**
 * Load source skills and hooks without reading credential-bearing MCP config.
 * @returns Real canonical content with an anonymous declared tools-server fixture.
 */
function readSeiriSources(): PluginFacts {
  const root = join(SEIRI_ROOT, "skills");
  const skillFiles = Object.fromEntries(
    readdirSync(root, { recursive: true })
      .map(String)
      .filter((path) => statSync(join(root, path)).isFile())
      .map((path) => [
        path.split(sep).join("/"),
        readFileSync(join(root, path), "utf8"),
      ]),
  );
  return {
    directory: SEIRI_ROOT,
    name: "seiri",
    manifest: { name: "seiri" },
    hasSkills: true,
    hasHooks: true,
    skillFiles,
    agentFiles: {},
    hooksFile: JSON.parse(
      readFileSync(join(SEIRI_ROOT, "hooks/hooks.json"), "utf8"),
    ),
    codexHookRuntime: JSON.parse(
      readFileSync(join(SEIRI_ROOT, "plugin-compiler.json"), "utf8"),
    ).codexHookRuntime,
    mcpServers: { tools: { command: "node", args: ["bridge/server.cjs"] } },
  };
}

// filid:contract AC-seiri-mcp-surface
describe("seiri canonical MCP surfaces", () => {
  it("adapts all owned source references and retains relative workflow links", () => {
    const facts = readSeiriSources();
    const before = structuredClone(facts);
    const files = buildCodexSkills(facts)!;
    expect(files).toHaveLength(Object.keys(facts.skillFiles).length);
    for (const file of files) {
      expect(file.content).not.toContain("mcp__plugin_seiri_");
      expect(file.content).not.toContain("ogham-mcp-tools:");
    }
    for (const name of ["runtime", "gates", "settings"])
      expect(
        files.some((file) => file.content.includes(`mcp__seiri__${name}`)),
      ).toBe(true);
    for (const name of [
      "implement",
      "receive-review",
      "request-review",
      "review-plan",
      "trace-cause",
      "trace-structure",
      "write-plan",
    ]) {
      const copy = files.find((file) =>
        file.relativePath.endsWith(`/${name}/SKILL.md`),
      )!;
      expect(copy, name).toBeDefined();
      expect(copy.content, name).toContain("mcp__seiri__runtime");
      expect(copy.content, name).not.toContain(
        "mcp__plugin_seiri_tools__runtime",
      );
    }
    const finish = files.find((file) =>
      file.relativePath.endsWith("/finish/SKILL.md"),
    )!;
    expect(finish.content).toContain(
      "../execute/references/workflow-lifecycle.md",
    );
    expect(
      files.some((file) =>
        file.relativePath.endsWith("/execute/references/workflow-lifecycle.md"),
      ),
    ).toBe(true);
    expect(facts).toEqual(before);
    expect(readSeiriSources()).toEqual(before);
  });

  it("routes the manifest and exact Pre/Post hook tokens to Codex surfaces", () => {
    const facts = readSeiriSources();
    const manifest = buildCodexPluginManifest(facts);
    expect(manifest.skills).toBe("./.codex-plugin/skills/");
    expect(manifest.hooks).toBe("./.codex-plugin/hooks.json");
    const emitted = JSON.stringify(buildCodexHooks(facts));
    expect(facts.codexHookRuntime).toBe("bridge/codex");
    expect(emitted).toContain("bridge/codex/post-tool-use.mjs");
    expect(emitted).toContain("Bash|mcp__seiri__runtime");
    expect(emitted).not.toContain("mcp__plugin_seiri_tools__runtime");
    for (const event of ["PreToolUse", "PostToolUse"])
      expect(
        facts.hooksFile!.hooks![event].some((group) =>
          group.matcher?.includes("mcp__plugin_seiri_tools__runtime"),
        ),
      ).toBe(true);
  });
});
