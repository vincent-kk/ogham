/**
 * @file config-loader.ts
 * @description Per-project FCA rule overrides via .filid/config.json.
 *
 * Uses `execSync('git rev-parse')` internally to resolve git repository root.
 */
import { execSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../lib/logger.js';
import { BUILTIN_RULE_IDS, type RuleOverride } from '../../types/rules.js';

const log = createLogger('config-loader');

/** Schema of .filid/config.json */
export interface FilidConfig {
  version: string;
  rules: Record<string, RuleOverride>;
}

const CONFIG_DIR = '.filid';
const CONFIG_FILE = 'config.json';

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
  };
}

/** Read rule overrides from .filid/config.json. Returns empty object if no config. */
export function loadRuleOverrides(
  projectRoot: string,
): Record<string, RuleOverride> {
  const config = loadConfig(projectRoot);
  return config?.rules ?? {};
}

/** Result of initProject. */
export interface InitResult {
  configCreated: boolean;
  fcaRulesCopied: boolean;
  filePath: {
    config: string;
    fcaRules: string;
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
 * Ensure .claude/rules/fca.md exists by copying from the plugin template.
 * Does NOT overwrite an existing file. Safe to call on every session start.
 *
 * @param projectRoot - Project directory (used as-is, caller should resolve git root if needed)
 * @param pluginRoot - Plugin root directory (defaults to CLAUDE_PLUGIN_ROOT env var)
 * @returns true if the file was copied, false if it already existed or copy failed
 */
export function ensureFcaRules(
  projectRoot: string,
  pluginRoot?: string,
): boolean {
  const root = pluginRoot ?? process.env.CLAUDE_PLUGIN_ROOT;
  const fcaRulesPath = join(projectRoot, '.claude', 'rules', 'fca.md');

  if (existsSync(fcaRulesPath)) return false;

  mkdirSync(join(projectRoot, '.claude', 'rules'), { recursive: true });
  if (root) {
    const templatePath = join(root, 'templates', 'rules', 'fca.md');
    if (existsSync(templatePath)) {
      copyFileSync(templatePath, fcaRulesPath);
      log.debug('copied fca.md template', fcaRulesPath);
      return true;
    } else {
      log.error('fca.md template not found at', templatePath);
    }
  } else {
    log.error('CLAUDE_PLUGIN_ROOT not set, cannot locate fca.md template');
  }
  return false;
}

/**
 * Initialize FCA-AI project infrastructure.
 * Creates .filid/config.json and .claude/rules/fca.md if they don't exist.
 *
 * Resolves the git repository root from the given path so that config files
 * are always created at the repository root, not at an arbitrary subdirectory.
 *
 * @param projectRoot - Target project directory (git root will be resolved from this)
 * @param pluginRoot - Plugin root directory (defaults to CLAUDE_PLUGIN_ROOT env var)
 */
export function initProject(
  projectRoot: string,
  pluginRoot?: string,
): InitResult {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const root = pluginRoot ?? process.env.CLAUDE_PLUGIN_ROOT;
  const configPath = join(resolvedRoot, CONFIG_DIR, CONFIG_FILE);
  const fcaRulesPath = join(resolvedRoot, '.claude', 'rules', 'fca.md');

  // 1. Create .filid/config.json
  let configCreated = false;
  if (!existsSync(configPath)) {
    writeConfig(resolvedRoot, createDefaultConfig());
    configCreated = true;
    log.debug('created default config', configPath);
  }

  // 2. Copy templates/rules/fca.md → .claude/rules/fca.md
  const fcaRulesCopied = ensureFcaRules(resolvedRoot, root);

  return {
    configCreated,
    fcaRulesCopied,
    filePath: { config: configPath, fcaRules: fcaRulesPath },
  };
}
