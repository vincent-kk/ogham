/**
 * @file routePatternSanitize.ts
 * @description Load-time validation for `additional-route-patterns`.
 *
 * Each entry must compile as a RegExp; uncompilable strings are dropped
 * from the config and caller-supplied `addWarning` receives a diagnostic
 * so the loader can surface it via `configWarnings[]` and `log.warn`.
 */
import type { FilidConfig } from '../loaders/configSchemas.js';

/** Returns true if `pattern` is a non-empty string that compiles as a RegExp. */
function isCompilableRegExp(pattern: string): boolean {
  if (typeof pattern !== 'string' || pattern.length === 0) return false;
  try {
    return Boolean(new RegExp(pattern));
  } catch {
    return false;
  }
}

/**
 * Drop uncompilable entries from `additional-route-patterns`. Returns the
 * sanitised config — a shallow clone when any entry was dropped, the
 * original input otherwise.
 */
export function sanitizeRoutePatterns(
  config: FilidConfig,
  addWarning: (msg: string) => void,
): FilidConfig {
  const patterns = config['additional-route-patterns'];
  if (!patterns || patterns.length === 0) return config;
  const kept: string[] = [];
  let dropped = false;
  for (const pattern of patterns) {
    if (isCompilableRegExp(pattern)) {
      kept.push(pattern);
      continue;
    }
    addWarning(
      `additional-route-patterns: "${pattern}" is not a valid regular expression and was skipped (dropped). Check for unescaped special characters. Example of a valid pattern: "^\\(app\\)$" (matches route group "(app)")`,
    );
    dropped = true;
  }
  return dropped ? { ...config, 'additional-route-patterns': kept } : config;
}
