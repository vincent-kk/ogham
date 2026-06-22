import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let cached: string | null = null;

/**
 * Resolve the committed `bridge/` directory (built FE assets). Honors
 * CLAUDE_PLUGIN_ROOT, then walks up from this module — works both as the esbuild
 * CJS bundle (import.meta.url shimmed by buildMcpServer.mjs) and from TS sources.
 */
export function bridgeRoot(): string {
  if (cached) return cached;
  const fromEnv = process.env.CLAUDE_PLUGIN_ROOT;
  if (fromEnv) {
    const candidate = join(fromEnv, "bridge");
    if (existsSync(candidate)) {
      cached = candidate;
      return candidate;
    }
  }
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, "bridge");
    if (existsSync(candidate)) {
      cached = candidate;
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  cached = join(fromEnv ?? process.cwd(), "bridge");
  return cached;
}
