import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Deep enough for `<plugin>/bridge/mcp-server.cjs` and for unbundled `dist/**` sources. */
const MAX_WALK_UP_DEPTH = 8;

/**
 * Find the plugin's install directory by walking up from this module's own location
 * until a plugin manifest appears.
 *
 * This is the answer for hosts whose plugin-root channel we cannot read: `agy` ships
 * no `CLAUDE_PLUGIN_ROOT` and its `mcp_config.json` has no `cwd` field to pin, so the
 * env-and-cwd channels are both empty there. Rather than *assume* a cwd we have never
 * measured, this asks the filesystem a question it can answer: every plugin bundles
 * its MCP server to `<plugin>/bridge/mcp-server.cjs`, and every plugin ships a manifest
 * at its root — so the answer is verified, not guessed, on every host.
 *
 * Both manifest spellings are accepted: `.claude-plugin/plugin.json` is the canonical
 * one, and the compiler emits a byte-identical copy at the root for Codex and agy. Any
 * install layout that carries the plugin carries at least one of them.
 *
 * @param startDir - Where to begin the walk. Defaults to this module's directory; tests
 *   pass a fixture root, since the module's real location is a property of the bundle.
 */
export function locatePluginRoot(
  startDir: string | null = moduleDir(),
): string | null {
  if (startDir === null) return null;

  let dir = startDir;
  for (let depth = 0; depth < MAX_WALK_UP_DEPTH; depth += 1) {
    if (isPluginRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function isPluginRoot(dir: string): boolean {
  return (
    existsSync(join(dir, ".claude-plugin", "plugin.json")) ||
    existsSync(join(dir, "plugin.json"))
  );
}

/**
 * The directory holding the running copy of this module.
 *
 * esbuild empties `import.meta` when it targets CJS unless the build defines a shim,
 * and not every plugin's bundler does — `__filename` is what survives there. filid's
 * `getSgModule` takes the same precaution for the same reason.
 */
function moduleDir(): string | null {
  const url: string | undefined = import.meta.url;
  if (url) return dirname(fileURLToPath(url));
  const file: string | undefined =
    typeof __filename === "string" ? __filename : undefined;
  return file === undefined ? null : dirname(file);
}
