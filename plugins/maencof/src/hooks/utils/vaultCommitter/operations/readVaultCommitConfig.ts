/**
 * @file readVaultCommitConfig.ts
 * @description Read and validate .maencof-meta/vault-commit.json into a VaultCommitConfig.
 */
import { existsSync, readFileSync } from 'node:fs';

import {
  MESSAGE_TEMPLATE_MIN_PREFIX_CHARS,
  VAULT_COMMIT_CONFIG_FILE,
} from '../../../../constants/vaultCommitter.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/operations/appendErrorLogSafe.js';
import { metaPath } from '../../../shared/metaPath.js';
import { templateStaticPrefix } from '../../gitUtils/message/templateStaticPrefix.js';
import type { VaultCommitConfig } from '../types/types.js';

function isSafeScopeEntry(entry: unknown): entry is string {
  return (
    typeof entry === 'string' &&
    entry.length > 0 &&
    !entry.startsWith('/') &&
    !entry.includes(':') &&
    !entry.includes('..') &&
    entry !== '.git' &&
    !entry.startsWith('.git/')
  );
}

/**
 * Read and validate vault-commit.json. Returns null if missing, malformed, or disabled.
 * `scope`, `fold_daily`, and `skip_patterns` are optional; invalid entries are
 * dropped item-by-item but do not invalidate the whole config. Unknown fields
 * are ignored (legacy hand-written configs).
 */
export function readVaultCommitConfig(cwd: string): VaultCommitConfig | null {
  const configPath = metaPath(cwd, VAULT_COMMIT_CONFIG_FILE);
  if (!existsSync(configPath)) return null;
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'enabled' in parsed &&
      typeof (parsed as VaultCommitConfig).enabled === 'boolean'
    ) {
      const config: VaultCommitConfig = {
        enabled: (parsed as VaultCommitConfig).enabled,
      };
      const fields = parsed as Record<string, unknown>;
      if (Array.isArray(fields.scope)) {
        const validScope = fields.scope.filter(isSafeScopeEntry);
        if (validScope.length > 0) config.scope = validScope;
      }
      if (typeof fields.fold_daily === 'boolean')
        config.fold_daily = fields.fold_daily;
      if (
        typeof fields.message_template === 'string' &&
        templateStaticPrefix(fields.message_template).trim().length >=
          MESSAGE_TEMPLATE_MIN_PREFIX_CHARS
      )
        config.message_template = fields.message_template;
      if (Array.isArray(fields.skip_patterns)) {
        const validPatterns = fields.skip_patterns.filter(
          (p): p is string => typeof p === 'string' && p.length > 0,
        );
        if (validPatterns.length > 0) config.skip_patterns = validPatterns;
      }
      return config;
    }
    return null;
  } catch (e) {
    appendErrorLogSafe(cwd, {
      hook: 'vault-committer',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}
