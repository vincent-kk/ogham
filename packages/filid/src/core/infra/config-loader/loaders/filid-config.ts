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
import { sanitizeExemptPatterns } from '../utils/exempt-sanitize.js';
import { resolveGitRoot } from '../utils/resolve-git-root.js';
import {
  formatIssuePath,
  parseWithAllowlistWarn,
} from '../utils/zod-sanitize.js';

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

/**
 * Read `.filid/config.json` from the given project root (resolves git root).
 *
 * Returns `{ config, warnings }`. Zod-based strict validation is applied;
 * unknown top-level or rule-override keys are warn+dropped (never
 * pass-through), and invalid `rules[*].exempt` globs (including the bare
 * `**` wildcard) are rejected at load time. Consumers that do not need
 * warnings may destructure only `{ config }`.
 */
export function loadConfig(projectRoot: string): LoadConfigResult {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const configPath = join(resolvedRoot, CONFIG_DIR, CONFIG_FILE);
  const warnings: string[] = [];
  const addWarning = (msg: string): void => {
    warnings.push(msg);
    log.warn(msg);
  };
  if (!existsSync(configPath)) {
    log.debug('config not found', configPath);
    return { config: null, warnings };
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (err) {
    log.error('failed to read config', err);
    addWarning(`failed to read ${configPath}: ${String(err)}`);
    return { config: null, warnings };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    log.error('failed to parse config JSON', err);
    addWarning(`failed to parse JSON at ${configPath}: ${String(err)}`);
    return { config: null, warnings };
  }

  const strict = FilidConfigSchema.safeParse(parsed);
  if (strict.success) {
    log.debug('config loaded (strict)', configPath);
    return { config: sanitizeExemptPatterns(strict.data, addWarning), warnings };
  }

  const { sanitized } = parseWithAllowlistWarn(
    parsed,
    strict.error,
    addWarning,
  );

  const retry = FilidConfigSchema.safeParse(sanitized);
  if (retry.success) {
    log.debug('config loaded (sanitized)', configPath);
    return { config: sanitizeExemptPatterns(retry.data, addWarning), warnings };
  }

  for (const issue of retry.error.issues) {
    addWarning(
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

  // `validateConfigPatch` returns diagnostics via `errors[]`; the sanitize
  // callbacks' free-form warnings are redundant here, so swallow them.
  const noop = (): void => {};
  const { sanitized } = parseWithAllowlistWarn(parsed, strict.error, noop);
  const retry = FilidConfigSchema.safeParse(sanitized);
  if (retry.success) {
    const suggestionObject = sanitizeExemptPatterns(retry.data, noop);
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
