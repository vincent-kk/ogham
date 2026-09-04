import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pluginRoot } from '@ogham/cross-platform';

/**
 * Resolves a public asset from an installed plugin or a source checkout.
 *
 * @param name - File name relative to the plugin's public directory.
 * @returns The first existing absolute asset path.
 * @throws When the asset is absent from every supported runtime location.
 */
export function resolvePublicAsset(name: string): string {
  const candidates: string[] = [];

  const root = pluginRoot();
  if (root) {
    const candidate = join(root, 'public', name);
    candidates.push(candidate);
    if (existsSync(candidate)) return candidate;
  }

  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, 'public', name);
    candidates.push(candidate);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `[filid] settings asset not found: public/${name}. Searched: ${candidates.join(', ')}`,
  );
}
