/**
 * @file config-loader.ts
 * @description Per-project FCA rule overrides via .filid/config.json.
 *
 * Also exposes the rule-doc sync framework used exclusively by the
 * `/filid:filid-setup` skill. Session hooks MUST NOT call `syncRuleDocs`;
 * rule-doc file deployment is a user-initiated operation, never automatic.
 *
 * Uses `execSync('git rev-parse')` internally to resolve git repository root.
 */
import { execSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../lib/logger.js';
import { BUILTIN_RULE_IDS, type RuleOverride } from '../../../types/rules.js';

import { CONFIG_DIR, CONFIG_FILE } from '../../../constants/infra-defaults.js';

const log = createLogger('config-loader');

/** Schema of .filid/config.json */
export interface FilidConfig {
  version: string;
  rules: Record<string, RuleOverride>;
  /** Output language for documents (INTENT.md, DETAIL.md, reviews, PRs). Falls back to 'en'. */
  language?: string;
  /** Additional file names allowed as peer files in fractal roots (zero-peer-file rule). */
  'additional-allowed'?: string[];
  /**
   * User-selected optional rule docs that should be deployed to `.claude/rules/`.
   * Keys match `RuleDocEntry.id` in `templates/rules/manifest.json`.
   * `true` → deploy on next filid-setup run; `false` or absent → remove.
   * Required rules (e.g. `fca`) ignore this map and are always deployed.
   */
  'injected-rules'?: Record<string, boolean>;
}

/** Read .filid/config.json from the given project root (resolves git root). Returns null if not found or invalid. */
export function loadConfig(projectRoot: string): FilidConfig | null {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const configPath = join(resolvedRoot, CONFIG_DIR, CONFIG_FILE);
  if (!existsSync(configPath)) {
    log.debug('config not found', configPath);
    return null;
  }
  try {
    const raw = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as FilidConfig;
    log.debug('config loaded', configPath);
    return parsed;
  } catch (err) {
    log.error('failed to parse config', err);
    return null;
  }
}

/** Write .filid/config.json with the given config. Creates .filid/ directory if needed. */
export function writeConfig(projectRoot: string, config: FilidConfig): void {
  const configDir = join(projectRoot, CONFIG_DIR);
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
    'injected-rules': {},
  };
}

/** Read rule overrides from .filid/config.json. Returns empty object if no config. */
export function loadRuleOverrides(
  projectRoot: string,
): Record<string, RuleOverride> {
  const config = loadConfig(projectRoot);
  return config?.rules ?? {};
}

/**
 * Resolve the output language from config.
 * Priority: config.language → 'en' (default).
 * System-level language detection is handled at the hook/skill layer.
 */
export function resolveLanguage(config: FilidConfig | null): string {
  return config?.language ?? 'en';
}

/** Result of initProject. */
export interface InitResult {
  configCreated: boolean;
  filePath: {
    config: string;
  };
}

/** git root cache: dirPath → resolved root */
const gitRootCache = new Map<string, string>();

/**
 * Resolve the git repository root for a given directory path.
 * Returns the path itself if git root cannot be determined.
 * Results are cached per dirPath to avoid repeated execSync calls.
 */
function resolveGitRoot(dirPath: string): string {
  const cached = gitRootCache.get(dirPath);
  if (cached !== undefined) return cached;
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: dirPath,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    gitRootCache.set(dirPath, gitRoot);
    return gitRoot;
  } catch {
    log.debug('git root not found, using provided path', dirPath);
    gitRootCache.set(dirPath, dirPath);
    return dirPath;
  }
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

// ---------------------------------------------------------------------------
// Rule doc sync framework
//
// The skill-only path for deploying optional/mandatory rule docs to
// `.claude/rules/`. Driven by `templates/rules/manifest.json`. SessionStart
// hooks never call these functions; first-session UX is a pointer warning
// from context-injector directing users to `/filid:filid-setup`.
// ---------------------------------------------------------------------------

/** Single entry in templates/rules/manifest.json. */
export interface RuleDocEntry {
  id: string;
  filename: string;
  required: boolean;
  title: string;
  description: string;
}

/** Envelope for templates/rules/manifest.json. */
export interface RuleDocsManifest {
  version: string;
  rules: RuleDocEntry[];
}

/** Report returned by syncRuleDocs. */
export interface RuleDocSyncResult {
  copied: string[];
  removed: string[];
  unchanged: string[];
  skipped: Array<{ id: string; reason: string }>;
}

/** Per-rule status snapshot used by the filid-setup checkbox UI. */
export interface RuleDocStatusEntry {
  id: string;
  filename: string;
  required: boolean;
  title: string;
  description: string;
  /** File currently exists on disk under `.claude/rules/`. */
  deployed: boolean;
  /** Config opts this rule in. Always `true` for required rules. */
  selected: boolean;
}

/** Result of getRuleDocsStatus. */
export interface RuleDocsStatus {
  entries: RuleDocStatusEntry[];
  pluginRootResolved: boolean;
  manifestPath: string | null;
}

/**
 * Load and validate the rule docs manifest shipped with the filid plugin.
 * Throws if the manifest is missing or malformed.
 */
export function loadRuleDocsManifest(pluginRoot: string): RuleDocsManifest {
  const manifestPath = join(pluginRoot, 'templates', 'rules', 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`rule docs manifest not found at ${manifestPath}`);
  }
  const raw = readFileSync(manifestPath, 'utf8');
  const parsed = JSON.parse(raw) as RuleDocsManifest;
  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error(`rule docs manifest has invalid shape at ${manifestPath}`);
  }
  return parsed;
}

/**
 * Resolve the desired selection set for a given project.
 * Required rules are always selected. Optional rules honour
 * `config['injected-rules'][id] === true`.
 */
export function resolveRuleDocSelection(
  manifest: RuleDocsManifest,
  config: FilidConfig | null,
): Set<string> {
  const injected = config?.['injected-rules'] ?? {};
  const selected = new Set<string>();
  for (const entry of manifest.rules) {
    if (entry.required || injected[entry.id] === true) {
      selected.add(entry.id);
    }
  }
  return selected;
}

/** Resolve the plugin root from caller argument or CLAUDE_PLUGIN_ROOT env. */
function resolvePluginRoot(pluginRoot?: string): string | null {
  return pluginRoot ?? process.env.CLAUDE_PLUGIN_ROOT ?? null;
}

/**
 * Inspect the current rule doc state (filesystem + config) without mutating
 * anything. Used by the filid-setup skill to render a checkbox UI.
 */
export function getRuleDocsStatus(
  projectRoot: string,
  pluginRoot?: string,
): RuleDocsStatus {
  const root = resolvePluginRoot(pluginRoot);
  if (root === null) {
    return { entries: [], pluginRootResolved: false, manifestPath: null };
  }

  const manifestPath = join(root, 'templates', 'rules', 'manifest.json');
  let manifest: RuleDocsManifest;
  try {
    manifest = loadRuleDocsManifest(root);
  } catch (err) {
    log.error('failed to load rule docs manifest', err);
    return { entries: [], pluginRootResolved: true, manifestPath };
  }

  const resolvedRoot = resolveGitRoot(projectRoot);
  const config = loadConfig(resolvedRoot);
  const injected = config?.['injected-rules'] ?? {};

  const entries: RuleDocStatusEntry[] = manifest.rules.map((entry) => {
    const destPath = join(
      resolvedRoot,
      '.claude',
      'rules',
      entry.filename,
    );
    const deployed = existsSync(destPath);
    const selected = entry.required || injected[entry.id] === true;
    return {
      id: entry.id,
      filename: entry.filename,
      required: entry.required,
      title: entry.title,
      description: entry.description,
      deployed,
      selected,
    };
  });

  return { entries, pluginRootResolved: true, manifestPath };
}

/**
 * Synchronise `.claude/rules/` with the desired selection.
 *
 * Behaviour per entry:
 * - required OR selected + file absent → copy from plugin template
 * - required OR selected + file present → unchanged (user edits preserved)
 * - not selected + file present → removed
 * - not selected + file absent → unchanged
 *
 * This function MUST be invoked exclusively from the filid-setup skill. It is
 * safe to call repeatedly (idempotent relative to the selection input).
 *
 * @param projectRoot - Target project (git root resolved internally)
 * @param selection - Rule ids the user has opted into (plus required rules)
 * @param pluginRoot - Plugin root directory (defaults to CLAUDE_PLUGIN_ROOT)
 */
export function syncRuleDocs(
  projectRoot: string,
  selection: Iterable<string>,
  pluginRoot?: string,
): RuleDocSyncResult {
  const result: RuleDocSyncResult = {
    copied: [],
    removed: [],
    unchanged: [],
    skipped: [],
  };

  const root = resolvePluginRoot(pluginRoot);
  if (root === null) {
    result.skipped.push({
      id: '*',
      reason: 'CLAUDE_PLUGIN_ROOT not set and no pluginRoot provided',
    });
    return result;
  }

  let manifest: RuleDocsManifest;
  try {
    manifest = loadRuleDocsManifest(root);
  } catch (err) {
    result.skipped.push({
      id: '*',
      reason: `manifest load failed: ${(err as Error).message}`,
    });
    return result;
  }

  const resolvedRoot = resolveGitRoot(projectRoot);
  const rulesDir = join(resolvedRoot, '.claude', 'rules');
  const selectionSet = new Set(selection);

  for (const entry of manifest.rules) {
    const desired = entry.required || selectionSet.has(entry.id);
    const destPath = join(rulesDir, entry.filename);
    const templatePath = join(root, 'templates', 'rules', entry.filename);
    const destExists = existsSync(destPath);

    if (desired) {
      if (destExists) {
        result.unchanged.push(entry.filename);
        continue;
      }
      if (!existsSync(templatePath)) {
        result.skipped.push({
          id: entry.id,
          reason: `template missing at ${templatePath}`,
        });
        continue;
      }
      try {
        mkdirSync(rulesDir, { recursive: true });
        copyFileSync(templatePath, destPath);
        result.copied.push(entry.filename);
      } catch (err) {
        result.skipped.push({
          id: entry.id,
          reason: `copy failed: ${(err as Error).message}`,
        });
      }
      continue;
    }

    // not desired
    if (!destExists) {
      result.unchanged.push(entry.filename);
      continue;
    }
    try {
      unlinkSync(destPath);
      result.removed.push(entry.filename);
    } catch (err) {
      result.skipped.push({
        id: entry.id,
        reason: `remove failed: ${(err as Error).message}`,
      });
    }
  }

  return result;
}
