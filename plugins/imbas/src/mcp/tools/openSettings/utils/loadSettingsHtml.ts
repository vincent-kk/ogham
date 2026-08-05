import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pluginRoot } from '@ogham/cross-platform';

/**
 * Read the built settings UI (`public/settings.html`). The file ships beside
 * the plugin (`package.json:files`) and is read from disk at runtime instead
 * of being inlined into the MCP bundle.
 *
 * Resolution walks up from this module's location first — deterministic for
 * both the esbuild CJS bundle (`bridge/`) and the TypeScript sources (vitest).
 * `pluginRoot()` (CLAUDE_PLUGIN_ROOT) is only a fallback: in-process harnesses
 * inherit the ambient value of whichever plugin hosts the session, so trusting
 * it first can serve another plugin's settings page.
 */
let cached: string | null = null;

export function loadSettingsHtml(): string {
  if (cached === null)
    cached = readFileSync(resolvePublicAsset('settings.html'), 'utf-8');

  return cached;
}

function resolvePublicAsset(name: string): string {
  const candidates: string[] = [];

  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, 'public', name);
    candidates.push(candidate);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const root = pluginRoot();
  if (root) {
    const candidate = join(root, 'public', name);
    candidates.push(candidate);
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    `[imbas] settings asset not found: public/${name}. Searched: ${candidates.join(', ')}`,
  );
}
