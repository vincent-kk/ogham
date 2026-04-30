import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface HookConfig {
  language?: string;
  rules?: Record<string, { enabled?: boolean } | undefined>;
  'additional-allowed'?: string[];
}

/**
 * Read .filid/config.json without zod validation. Hooks deliberately bypass
 * the strict loader (src/core/infra/config-loader) because pulling zod into
 * the hook bundle exceeds the per-event cold-start budget.
 *
 * Returns null on any failure (missing file, invalid JSON, IO error).
 * Callers treat null as "config not initialized" and graceful-degrade.
 */
export function readHookConfig(cwd: string): HookConfig | null {
  const path = join(cwd, '.filid', 'config.json');
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as HookConfig)
      : null;
  } catch {
    return null;
  }
}
