import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Parse and validate the vault and host selected for initial setup.
 * @param {string[]} argv raw CLI arguments
 * @returns {{host: 'codex' | 'claude', vaultRoot: string}} resolved setup target
 */
export function resolveCraftTarget(argv) {
  let host = 'codex';
  let requestedVault;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--host') {
      host = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--')) {
      throw new Error(`Unknown option: ${token}`);
    } else if (requestedVault) {
      throw new Error(`Unexpected argument: ${token}`);
    } else {
      requestedVault = token;
    }
  }
  if (!['codex', 'claude'].includes(host)) {
    throw new Error('--host must be codex or claude');
  }
  const vaultRoot = resolve(requestedVault || process.cwd());
  if (!existsSync(vaultRoot) || !statSync(vaultRoot).isDirectory()) {
    throw new Error(`Vault root is not a directory: ${vaultRoot}`);
  }
  return { host, vaultRoot };
}
