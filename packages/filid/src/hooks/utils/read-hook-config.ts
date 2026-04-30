import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface HookConfig {
  language?: string;
  rules?: Record<string, { enabled?: boolean } | undefined>;
}

/**
 * Read .filid/config.json without zod validation. Hooks deliberately bypass
 * the strict loader (src/core/infra/config-loader) because pulling zod into
 * the hook bundle exceeds the per-event cold-start budget.
 *
 * Returns null on any failure (missing file, invalid JSON, IO error).
 * Per-field sanitize: fields that fail their type contract are dropped so
 * callers see them as missing and graceful-degrade (language → 'en',
 * disabled-rules line omitted).
 */
export function readHookConfig(cwd: string): HookConfig | null {
  const path = join(cwd, '.filid', 'config.json');
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
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
