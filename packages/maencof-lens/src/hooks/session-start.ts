import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { loadConfig } from '../config/config-loader.js';
import { CONFIG_DIR, CONFIG_FILE } from '../config/defaults.js';
import { detectStale } from '../vault/stale-detector.js';

export interface LensSessionStartResult {
  continue: boolean;
  hookSpecificOutput?: {
    additionalContext?: string;
  };
}

export async function runSessionStart(cwd: string): Promise<LensSessionStartResult> {
  const configPath = join(cwd, CONFIG_DIR, CONFIG_FILE);
  if (!existsSync(configPath)) {
    return { continue: true };
  }

  const config = loadConfig(cwd);
  if (!config) {
    return {
      continue: true,
      hookSpecificOutput: {
        additionalContext: '[maencof:lens] Warning: Invalid config at .maencof-lens/config.json',
      },
    };
  }

  const vaultLines: string[] = [];
  for (const vault of config.vaults) {
    const pathExists = existsSync(vault.path);
    const indexExists = pathExists && existsSync(join(vault.path, '.maencof', 'index.json'));
    let status = 'ready';

    if (!pathExists) {
      status = 'path not found';
    } else if (!indexExists) {
      status = 'index not built';
    } else {
      try {
        const staleInfo = await detectStale(vault.path);
        if (staleInfo.isStale) {
          status = `stale (${staleInfo.staleSince ?? 'unknown'})`;
        }
      } catch {
        status = 'ready';
      }
    }

    const defaultTag = vault.default ? ' [default]' : '';
    vaultLines.push(`- ${vault.name} (${vault.path})${defaultTag} — ${status}`);
  }

  const prompt = `[maencof:lens] Read-only vault access enabled.

Vault knowledge is available for reference during development.

Available tools: lens_search, lens_context, lens_navigate, lens_read, lens_status

Registered vaults:
${vaultLines.join('\n')}

Usage: vault data is read-only. Modifications require a maencof session.`;

  return {
    continue: true,
    hookSpecificOutput: {
      additionalContext: prompt,
    },
  };
}
