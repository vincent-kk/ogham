import { join } from 'node:path';

/**
 * Resolve the host-native location for the generated management skill.
 * @param {string} vaultRoot absolute vault root
 * @param {'codex' | 'claude'} host current coding-agent host
 * @returns {string} absolute local skill directory
 */
export function resolveManagerTarget(vaultRoot, host) {
  const hostDirectory = host === 'codex' ? '.agents' : '.claude';
  return join(vaultRoot, hostDirectory, 'skills', 'manage-library');
}
