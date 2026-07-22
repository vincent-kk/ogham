import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { portableDirname, portableJoin } from '@ogham/cross-platform/compat';
import { pluginRoot } from '@ogham/cross-platform/host-paths';

import { PUBLIC_DIR, SETTINGS_HTML } from '../../../../constants/files.js';
import { INJECTION_PREFIX } from '../../../../constants/plugin.js';

/**
 * Read the built settings UI (`public/settings.html`).
 *
 * The file ships beside the plugin and is read from disk at runtime rather
 * than inlined, which keeps the MCP bundle small. Resolution tries the
 * host-supplied plugin root first, then walks up from this module, so the
 * same code works from the esbuild bundle and from the TypeScript sources
 * under vitest.
 */
let cached: string | null = null;

export function loadSettingsHtml(): string {
  if (cached === null) cached = readFileSync(resolveSettingsHtml(), 'utf8');
  return cached;
}

function resolveSettingsHtml(): string {
  const searched: string[] = [];

  const root = pluginRoot();
  if (root) {
    const candidate = portableJoin(root, PUBLIC_DIR, SETTINGS_HTML);
    searched.push(candidate);
    if (existsSync(candidate)) return candidate;
  }

  let dir = portableDirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = portableJoin(dir, PUBLIC_DIR, SETTINGS_HTML);
    searched.push(candidate);
    if (existsSync(candidate)) return candidate;
    const parent = portableDirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `${INJECTION_PREFIX} settings asset not found: ${PUBLIC_DIR}/${SETTINGS_HTML}. Searched: ${searched.join(', ')}`,
  );
}
