import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { findConfigRoot } from './find-config-root.js';

export interface HookConfig {
  language?: string;
  rules?: Record<string, { enabled?: boolean } | undefined>;
}

/**
 * Read .filid/config.json without zod validation. Hooks deliberately bypass
 * the strict loader (src/core/infra/config-loader) because pulling zod into
 * the hook bundle exceeds the per-event cold-start budget.
 *
 * `cwd` may be any directory inside the project: the config is resolved by
 * walking up to the project root that holds `.filid/config.json` (see
 * `findConfigRoot`), matching the config-loader's git-root resolution. This
 * keeps the read path consistent with the write path even when the hook fires
 * from a subdirectory (e.g. a monorepo package).
 *
 * Returns null on any failure (no config up the tree, invalid JSON, IO error).
 * Per-field sanitize: fields that fail their type contract are dropped so
 * callers see them as missing and graceful-degrade (language → 'en',
 * disabled-rules line omitted).
 */
export function readHookConfig(cwd: string): HookConfig | null {
  const root = findConfigRoot(cwd);
  if (root === null) return null;
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(root, '.filid', 'config.json'), 'utf8'),
    );
    if (typeof parsed !== 'object' || parsed === null) return null;
    const raw = parsed as Record<string, unknown>;
    const config: HookConfig = {};
    if (typeof raw.language === 'string') config.language = raw.language;
    if (
      typeof raw.rules === 'object' &&
      raw.rules !== null &&
      !Array.isArray(raw.rules)
    )
      config.rules = raw.rules as HookConfig['rules'];
    return config;
  } catch {
    return null;
  }
}
