import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { CONFIG_DIR, CONFIG_FILE } from '../../../../constants/infra-defaults.js';
import { BUILTIN_RULE_IDS, type RuleOverride } from '../../../../types/rules.js';
import { resolveGitRoot } from '../utils/resolve-git-root.js';

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

/** Result of initProject. */
export interface InitResult {
  configCreated: boolean;
  filePath: {
    config: string;
  };
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
