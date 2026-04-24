/**
 * @file exempt-sanitize.ts
 * @description Load-time validation for `rules[*].exempt` glob patterns.
 *
 * Invalid glob syntax (rejected by the shared `globToRegExp` parser in
 * `src/lib/glob-to-regexp.ts`) and the pre-mortem-2 bare `**` wildcard
 * are dropped from the override; caller-supplied `addWarning` receives a
 * diagnostic for each drop so the loader can surface them via
 * `configWarnings[]` and `log.warn`.
 */
import { globToRegExp } from '../../../../lib/glob-to-regexp.js';
import type { FilidConfig } from '../loaders/config-schemas.js';

/**
 * Two-stage validation: (1) bracket/brace balance catches the common
 * unclosed-class/brace-set typos (`[invalid`, `foo{`) that `globToRegExp`
 * would silently escape into a valid literal RegExp. (2) `globToRegExp`
 * round-trip catches any residual RegExp-construction failure.
 */
function isValidGlobSyntax(pattern: string): boolean {
  if (typeof pattern !== 'string' || pattern.length === 0) return false;
  let brackets = 0;
  let braces = 0;
  let escaped = false;
  for (const ch of pattern) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
    else if (ch === '{') braces++;
    else if (ch === '}') braces--;
    if (brackets < 0 || braces < 0) return false;
  }
  if (brackets !== 0 || braces !== 0) return false;
  try {
    globToRegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Drop invalid / bare-`**` exempt patterns from each `RuleOverride.exempt`
 * array. Returns the sanitised config — a shallow-cloned `rules` map when
 * any override required a rewrite, the original input otherwise.
 */
export function sanitizeExemptPatterns(
  config: FilidConfig,
  addWarning: (msg: string) => void,
): FilidConfig {
  const rules = { ...config.rules };
  let mutated = false;
  for (const [ruleId, override] of Object.entries(rules)) {
    if (!override.exempt || override.exempt.length === 0) continue;
    const kept: string[] = [];
    let dropped = false;
    for (const pattern of override.exempt) {
      if (pattern === '**') {
        addWarning(
          `rules["${ruleId}"].exempt: bare "**" pattern dropped — use a concrete scope such as "packages/**" instead`,
        );
        dropped = true;
        continue;
      }
      if (!isValidGlobSyntax(pattern)) {
        addWarning(
          `rules["${ruleId}"].exempt: invalid glob syntax "${pattern}" (dropped)`,
        );
        dropped = true;
        continue;
      }
      kept.push(pattern);
    }
    if (dropped) {
      rules[ruleId] = { ...override, exempt: kept };
      mutated = true;
    }
  }
  return mutated ? { ...config, rules } : config;
}
