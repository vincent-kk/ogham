import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mergeConfigLayers } from '@ogham/cross-platform/config-scope/merge';
import { pluginCache } from '@ogham/cross-platform/paths/plugin-cache';

import { findConfigRoot } from './findConfigRoot.js';

export interface HookConfig {
  language?: string;
  rules?: Record<string, { enabled?: boolean } | undefined>;
  injection?: { ctxTtlTurns?: number };
}

/**
 * Read the config in effect without zod validation. Hooks deliberately
 * bypass the strict loader (src/core/infra/configLoader) because pulling zod
 * into the hook bundle exceeds the per-event cold-start budget.
 *
 * Two layers, same precedence as the strict loader: the user layer under the
 * host state root, overridden by `<projectRoot>/.filid/config.json`. Only
 * `config-scope/merge` and `paths/plugin-cache` are imported — both are
 * single-purpose entry points with no heavy graph behind them, so the bundle
 * guard in scripts/buildHooks.mjs still passes.
 *
 * `cwd` may be any directory inside the project: the project layer is found
 * by walking up to the root that holds `.filid/config.json` (see
 * `findConfigRoot`), matching the config-loader's git-root resolution. This
 * keeps the read path consistent with the write path even when the hook
 * fires from a subdirectory (e.g. a monorepo package).
 *
 * Returns null when neither layer yields anything usable. Per-field
 * sanitize: fields that fail their type contract are dropped so callers see
 * them as missing and graceful-degrade (language → 'en', disabled-rules line
 * omitted).
 */
export function readHookConfig(cwd: string): HookConfig | null {
  const root = findConfigRoot(cwd);
  const user = readLayer(join(pluginCache('filid'), 'config.json'));
  const project =
    root === null ? null : readLayer(join(root, '.filid', 'config.json'));
  if (user === null && project === null) return null;

  const raw = mergeConfigLayers(user, project);
  const config: HookConfig = {};
  if (typeof raw.language === 'string') config.language = raw.language;
  if (
    typeof raw.rules === 'object' &&
    raw.rules !== null &&
    !Array.isArray(raw.rules)
  )
    config.rules = raw.rules as HookConfig['rules'];
  if (
    typeof raw.injection === 'object' &&
    raw.injection !== null &&
    !Array.isArray(raw.injection)
  ) {
    const ttl = (raw.injection as Record<string, unknown>).ctxTtlTurns;
    if (typeof ttl === 'number' && Number.isFinite(ttl) && ttl >= 1)
      config.injection = { ctxTtlTurns: Math.floor(ttl) };
  }
  return config;
}

/** One layer's raw object, or null on absence, IO error or bad JSON. */
function readLayer(path: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
