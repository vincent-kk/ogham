import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Read the built settings UI (`public/settings.html`). Shipped beside the
 * plugin (package.json:files) and read at runtime rather than inlined into the
 * MCP bundle. Resolution prefers CLAUDE_PLUGIN_ROOT, then walks up from this
 * module (works in the esbuild bundle and when running TS sources directly).
 */
let cached: string | null = null;

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
    `[entrez] settings asset not found: public/${name}. Searched: ${candidates.join(", ")}`,
  );
}

export function loadSettingsHtml(): string {
  if (cached === null)
    cached = readFileSync(resolvePublicAsset("settings.html"), "utf-8");

  return cached;
}
