import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PLUGINS_ROOT = join(REPOSITORY_ROOT, "plugins");

/**
 * List the Markdown documents a plugin's skills and personas are built from.
 * @param {string} plugin Directory name under plugins/.
 * @returns {string[]} Absolute paths of every `.md` under skills/ and agents/.
 */
function canonicalDocuments(plugin) {
  const walk = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return walk(path);
      return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
    });
  return ["skills", "agents"]
    .map((directory) => join(PLUGINS_ROOT, plugin, directory))
    .filter((directory) => existsSync(directory))
    .flatMap(walk);
}

const plugins = readdirSync(PLUGINS_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

/** Documents naming their own plugin's MCP tools, with whether they carry the marker. */
const owned = plugins.flatMap((plugin) =>
  canonicalDocuments(plugin)
    .map((path) => ({ path, text: readFileSync(path, "utf8") }))
    .filter(({ text }) => text.includes(`mcp__plugin_${plugin}_`))
    .map(({ path, text }) => ({
      path: relative(REPOSITORY_ROOT, path),
      marked: text.includes(`<!-- ogham-mcp-tools:${plugin} -->`),
    })),
);

describe("Codex MCP tool markers", () => {
  it("marks every skill and persona document that names its own plugin's MCP tools", () => {
    assert.deepEqual(
      owned.filter(({ marked }) => !marked).map(({ path }) => path),
      [],
      "Add <!-- ogham-mcp-tools:<plugin> --> so the Codex copy calls Codex tool names",
    );
  });

  it("finds documents to check, so the sweep cannot pass on an empty match", () => {
    assert.ok(owned.length > 0);
  });
});
