import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve the vault from an explicit flag or the generated skill's host path.
 * @param {string} scriptUrl import.meta.url from the runner
 * @param {string | undefined} explicitVault optional caller-selected vault
 * @returns {string} absolute vault root
 */
export function resolveVaultRoot(scriptUrl, explicitVault) {
  if (explicitVault) return resolve(explicitVault);
  let current = dirname(fileURLToPath(scriptUrl));
  for (let depth = 0; depth < 8; depth += 1) {
    if (['.agents', '.claude'].includes(current.split(/[\\/]/).at(-1))) {
      return dirname(current);
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  const fallback = resolve(process.cwd());
  if (existsSync(resolve(fallback, 'library'))) return fallback;
  throw new Error(
    'Could not resolve the vault root from the installed skill path',
  );
}
