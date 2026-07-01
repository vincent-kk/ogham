import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Read the built settings UI (`public/settings.html`). The file ships beside the
 * plugin (`package.json:files`) and is read from disk at runtime instead of
 * being inlined into the MCP bundle.
 *
 * Resolution walks up from this module's location until a `public/` directory is
 * found, so it works both in the esbuild CJS bundle (`bridge/`) and when running
 * the TypeScript sources directly (vitest). `import.meta.url` is rewritten to the
 * bundle path by the banner/define shim in `scripts/build-mcp-server.mjs` (esbuild
 * empties bare `import.meta` in CJS output otherwise).
 */
let cached: string | null = null;

export function loadSettingsHtml(): string {
  if (cached === null)
    cached = readFileSync(resolvePublicAsset("settings.html"), "utf-8");
  return cached;
}

function resolvePublicAsset(name: string): string {
  const candidates: string[] = [];

  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
  if (pluginRoot) {
    const candidate = join(pluginRoot, "public", name);
    candidates.push(candidate);
    if (existsSync(candidate)) return candidate;
  }

  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, "public", name);
    candidates.push(candidate);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `[atlassian] settings asset not found: public/${name}. Searched: ${candidates.join(", ")}`,
  );
}
