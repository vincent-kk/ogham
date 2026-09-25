import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { readPluginFacts } from "../index.js";

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);

it("reads the optional compiler-only runtime directory without changing its source", () => {
  const root = mkdtempSync(join(tmpdir(), "compiler-config-"));
  roots.push(root);
  mkdirSync(join(root, ".claude-plugin"));
  writeFileSync(join(root, ".claude-plugin/plugin.json"), '{"name":"fixture"}');
  expect(readPluginFacts(root)).not.toHaveProperty("codexHookRuntime");
  writeFileSync(
    join(root, "plugin-compiler.json"),
    '{"codexHookRuntime":"bridge/codex"}',
  );
  expect(readPluginFacts(root)).toHaveProperty(
    "codexHookRuntime",
    "bridge/codex",
  );
});
