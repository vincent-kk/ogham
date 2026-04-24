import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

import { createLogger } from '../../../../lib/logger.js';
import { CONFIG_DIR, CONFIG_FILE } from '../../../../constants/infra-defaults.js';
import { DEFAULT_SCAN_OPTIONS } from '../../../../constants/scan-defaults.js';
import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import type { RuleOverride } from '../../../../types/rules.js';
import { resolveGitRoot } from '../utils/resolve-git-root.js';

const log = createLogger('config-loader');

/**
 * Single RuleOverride entry schema. Strict — unknown keys are surfaced as
 * zod issues so `loadConfig` can warn + physically drop them (never
 * pass-through).
 */
export const RuleOverrideSchema = z
  .object({
    enabled: z.boolean().optional(),
    severity: z.enum(['error', 'warning', 'info']).optional(),
    exempt: z.array(z.string()).optional(),
  })
  .strict();

/**
 * Entry accepted inside the top-level `additional-allowed` array.
 * Either a bare basename string (applied globally) or an object restricting
 * the basename to specific path globs. Consumed by the `zero-peer-file` rule.
 */
export const AllowedEntrySchema = z.union([
  z.string(),
  z
    .object({
      basename: z.string(),
      paths: z.array(z.string()).optional(),
    })
    .strict(),
]);

/** Allowed-entry union type derived from `AllowedEntrySchema`. */
export type AllowedEntry = z.infer<typeof AllowedEntrySchema>;

/**
 * Top-level `.filid/config.json` schema. `FilidConfig` is derived via
 * `z.infer` — this schema is the single source of truth for the type shape.
 * `.strict()` ensures unknown keys are reported by zod issues.
 */
export const FilidConfigSchema = z
  .object({
    version: z.string(),
    rules: z.record(z.string(), RuleOverrideSchema),
    language: z.string().optional(),
    'additional-allowed': z.array(AllowedEntrySchema).optional(),
    scan: z
      .object({
        maxDepth: z.number().nonnegative().finite().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

/** Schema of .filid/config.json (derived from FilidConfigSchema via zod). */
export type FilidConfig = z.infer<typeof FilidConfigSchema>;

/** Result of initProject. */
export interface InitResult {
  configCreated: boolean;
  filePath: {
    config: string;
  };
}

/**
 * Result of `loadConfig` — the config itself plus any structural warnings
 * raised during zod parsing or waiver sanitisation. Consumers that want to
 * surface warnings (e.g. MCP `configWarnings` field) destructure both;
 * consumers that only care about the config ignore `warnings`.
 */
export interface LoadConfigResult {
  config: FilidConfig | null;
  warnings: string[];
}

type PathSegment = string | number;

function formatIssuePath(path: ReadonlyArray<PathSegment>): string {
  if (path.length === 0) return '<root>';
  return path
    .map((seg, idx) =>
      typeof seg === 'number' ? `[${seg}]` : idx === 0 ? seg : `.${seg}`,
    )
    .join('');
}

function getAt(
  root: unknown,
  path: ReadonlyArray<PathSegment>,
): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
    } else {
      if (typeof cur !== 'object' || cur === null) return undefined;
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return cur;
}

function deleteAt(
  root: unknown,
  path: ReadonlyArray<PathSegment>,
): void {
  if (path.length === 0) return;
  const parent = getAt(root, path.slice(0, -1));
  const leaf = path[path.length - 1];
  if (parent === null || parent === undefined || leaf === undefined) return;
  if (Array.isArray(parent) && typeof leaf === 'number') {
    parent.splice(leaf, 1);
    return;
  }
  if (typeof parent === 'object' && typeof leaf === 'string') {
    delete (parent as Record<string, unknown>)[leaf];
  }
}

function pushWarn(list: string[], msg: string): void {
  list.push(msg);
  log.warn(msg);
}

/**
 * Strict-sanitize fallback for `FilidConfigSchema.safeParse` failures.
 * Walks each ZodIssue:
 *   - `unrecognized_keys`   → drop each named key from the parent object.
 *   - any other issue code  → drop the offending leaf value so a retry
 *                             yields a type-correct object.
 * The sanitised object is returned alongside the collected warnings. Pass
 * the result back through `FilidConfigSchema.safeParse` to get a typed
 * `FilidConfig`. Pass-through of unknown values is forbidden (plan §4 P1).
 */
function parseWithAllowlistWarn(
  parsed: unknown,
  error: z.ZodError,
): { sanitized: unknown; warnings: string[] } {
  const warnings: string[] = [];
  const root: unknown =
    typeof structuredClone === 'function'
      ? structuredClone(parsed)
      : JSON.parse(JSON.stringify(parsed)) as unknown;

  for (const issue of error.issues) {
    const pathStr = formatIssuePath(issue.path);
    if (issue.code === 'unrecognized_keys') {
      const parent = getAt(root, issue.path);
      if (
        parent === null ||
        parent === undefined ||
        typeof parent !== 'object' ||
        Array.isArray(parent)
      ) {
        pushWarn(
          warnings,
          `config validation failed at ${pathStr}: ${issue.message} (ignored, non-fatal; see migration guide)`,
        );
        continue;
      }
      for (const key of issue.keys) {
        pushWarn(
          warnings,
          `unknown key in ${pathStr}: "${key}" (dropped, non-fatal; see migration guide)`,
        );
        delete (parent as Record<string, unknown>)[key];
      }
      continue;
    }
    if (issue.path.length === 0) {
      pushWarn(
        warnings,
        `config validation failed: ${issue.message} (ignored, non-fatal; see migration guide)`,
      );
      continue;
    }
    pushWarn(
      warnings,
      `invalid value at ${pathStr}: ${issue.message} (dropped, non-fatal; see migration guide)`,
    );
    deleteAt(root, issue.path);
  }

  return { sanitized: root, warnings };
}

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
  return brackets === 0 && braces === 0;
}

/**
 * Dry-validate each `rules[*].exempt[]` glob pattern. Invalid syntax and the
 * pre-mortem-2 bare `**` wildcard are warn+dropped from the override; the
 * sanitised config is returned alongside the collected warnings.
 */
function sanitizeExemptPatterns(
  config: FilidConfig,
  warnings: string[],
): FilidConfig {
  const rules = { ...config.rules };
  let mutated = false;
  for (const [ruleId, override] of Object.entries(rules)) {
    if (!override.exempt || override.exempt.length === 0) continue;
    const kept: string[] = [];
    let dropped = false;
    for (const pattern of override.exempt) {
      if (pattern === '**') {
        pushWarn(
          warnings,
          `rules["${ruleId}"].exempt: bare "**" pattern dropped — use a concrete scope such as "packages/**" instead`,
        );
        dropped = true;
        continue;
      }
      if (!isValidGlobSyntax(pattern)) {
        pushWarn(
          warnings,
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

/**
 * Read `.filid/config.json` from the given project root (resolves git root).
 *
 * BREAKING (v0.4.0): returns `{ config, warnings }` rather than the bare
 * `FilidConfig | null`. Zod-based strict validation is applied; unknown
 * top-level or rule-override keys are warn+dropped (never pass-through), and
 * invalid `rules[*].exempt` globs (including the bare `**` wildcard) are
 * rejected at load time. Consumers that ignored warnings previously can
 * continue to destructure only `{ config }`.
 */
export function loadConfig(projectRoot: string): LoadConfigResult {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const configPath = join(resolvedRoot, CONFIG_DIR, CONFIG_FILE);
  const warnings: string[] = [];
  if (!existsSync(configPath)) {
    log.debug('config not found', configPath);
    return { config: null, warnings };
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (err) {
    log.error('failed to read config', err);
    pushWarn(warnings, `failed to read ${configPath}: ${String(err)}`);
    return { config: null, warnings };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    log.error('failed to parse config JSON', err);
    pushWarn(warnings, `failed to parse JSON at ${configPath}: ${String(err)}`);
    return { config: null, warnings };
  }

  const strict = FilidConfigSchema.safeParse(parsed);
  if (strict.success) {
    log.debug('config loaded (strict)', configPath);
    return { config: sanitizeExemptPatterns(strict.data, warnings), warnings };
  }

  const { sanitized, warnings: sanitizeWarnings } = parseWithAllowlistWarn(
    parsed,
    strict.error,
  );
  for (const w of sanitizeWarnings) warnings.push(w);

  const retry = FilidConfigSchema.safeParse(sanitized);
  if (retry.success) {
    log.debug('config loaded (sanitized)', configPath);
    return { config: sanitizeExemptPatterns(retry.data, warnings), warnings };
  }

  for (const issue of retry.error.issues) {
    pushWarn(
      warnings,
      `config validation failed at ${formatIssuePath(issue.path)}: ${issue.message}`,
    );
  }
  return { config: null, warnings };
}

/**
 * Resolve the effective fractal tree maxDepth from the priority chain:
 *   override (MCP input) → config.scan.maxDepth → DEFAULT_SCAN_OPTIONS.maxDepth
 *
 * Explicit `0` is honoured (early termination is allowed). `scan.maxDepth`
 * reaching here is already validated by zod, so no runtime type guard is needed.
 */
export function resolveMaxDepth(
  config: FilidConfig | null,
  override?: number,
): number {
  return override ?? config?.scan?.maxDepth ?? DEFAULT_SCAN_OPTIONS.maxDepth;
}

/** Write .filid/config.json with the given config. Resolves git root and creates .filid/ if needed. */
export function writeConfig(projectRoot: string, config: FilidConfig): void {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const configDir = join(resolvedRoot, CONFIG_DIR);
  mkdirSync(configDir, { recursive: true });
  const configPath = join(configDir, CONFIG_FILE);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  log.debug('config written', configPath);
}

/** Generate the default initial config with all 8 built-in rules. */
export function createDefaultConfig(): FilidConfig {
  return {
    version: '1.0',
    rules: {
      [BUILTIN_RULE_IDS.NAMING_CONVENTION]: {
        enabled: true,
        severity: 'warning',
      },
      [BUILTIN_RULE_IDS.ORGAN_NO_INTENTMD]: {
        enabled: true,
        severity: 'error',
      },
      [BUILTIN_RULE_IDS.INDEX_BARREL_PATTERN]: {
        enabled: true,
        severity: 'warning',
      },
      [BUILTIN_RULE_IDS.MODULE_ENTRY_POINT]: {
        enabled: true,
        severity: 'warning',
      },
      [BUILTIN_RULE_IDS.MAX_DEPTH]: { enabled: true, severity: 'error' },
      [BUILTIN_RULE_IDS.CIRCULAR_DEPENDENCY]: {
        enabled: true,
        severity: 'error',
      },
      [BUILTIN_RULE_IDS.PURE_FUNCTION_ISOLATION]: {
        enabled: true,
        severity: 'error',
      },
      [BUILTIN_RULE_IDS.ZERO_PEER_FILE]: { enabled: true, severity: 'warning' },
    },
  };
}

/** Read rule overrides from .filid/config.json. Returns empty object if no config. */
export function loadRuleOverrides(
  projectRoot: string,
): Record<string, RuleOverride> {
  const { config } = loadConfig(projectRoot);
  return config?.rules ?? {};
}

/** Single validation error returned by {@link validateConfigPatch}. */
export interface ConfigPatchIssue {
  path: string;
  message: string;
}

/**
 * Result of validating a prospective `.filid/config.json` patch string.
 * `suggestion` is the sanitised JSON (2-space indent) that would pass strict
 * validation — present only when the sanitize pipeline recovered a valid
 * config from the original patch.
 */
export interface ConfigPatchValidation {
  valid: boolean;
  errors: ConfigPatchIssue[];
  suggestion?: string;
}

/**
 * Validate a prospective `.filid/config.json` patch JSON string against the
 * shared {@link FilidConfigSchema}. No local schema is defined — this is the
 * SSoT contract for the `mcp_t_config_patch_validate` MCP tool.
 */
export function validateConfigPatch(patchJson: string): ConfigPatchValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(patchJson);
  } catch (err) {
    return {
      valid: false,
      errors: [
        {
          path: '<root>',
          message: `invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }

  const strict = FilidConfigSchema.safeParse(parsed);
  if (strict.success) {
    return { valid: true, errors: [] };
  }

  const errors: ConfigPatchIssue[] = strict.error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));

  const { sanitized } = parseWithAllowlistWarn(parsed, strict.error);
  const retry = FilidConfigSchema.safeParse(sanitized);
  if (retry.success) {
    const suggestionObject = sanitizeExemptPatterns(retry.data, []);
    return {
      valid: false,
      errors,
      suggestion: JSON.stringify(suggestionObject, null, 2),
    };
  }

  return { valid: false, errors };
}

/**
 * Resolve the output language from config.
 * Priority: config.language → 'en' (default).
 * System-level language detection is handled at the hook/skill layer.
 */
export function resolveLanguage(config: FilidConfig | null): string {
  return config?.language ?? 'en';
}

/**
 * Initialize FCA-AI project infrastructure — config only.
 *
 * Creates `.filid/config.json` at the git repository root if absent.
 * Rule doc deployment (`.claude/rules/*.md`) is NOT performed here; it is
 * handled exclusively by the `/filid:filid-setup` skill via `syncRuleDocs`.
 *
 * @param projectRoot - Target project directory (git root will be resolved from this)
 */
export function initProject(projectRoot: string): InitResult {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const configPath = join(resolvedRoot, CONFIG_DIR, CONFIG_FILE);

  let configCreated = false;
  if (!existsSync(configPath)) {
    writeConfig(resolvedRoot, createDefaultConfig());
    configCreated = true;
    log.debug('created default config', configPath);
  }

  return {
    configCreated,
    filePath: { config: configPath },
  };
}
