import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CONFIG_DIR,
  CONFIG_FILE,
} from '../../../../constants/infraDefaults.js';
import { createLogger } from '../../../../lib/logger.js';
import { resolveGitRoot } from '../utils/resolveGitRoot.js';

import type { InitProjectOptions, InitResult } from './configTypes.js';
import { FilidConfigFileSchema } from './configSchemas.js';
import { createDefaultConfig } from './createDefaultConfig.js';
import { normalizeConfigLayer } from './normalizeConfigLayer.js';
import { writeConfig } from './writeConfig.js';

const log = createLogger('config-loader');

/**
 * Initialize FCA-AI project infrastructure — config only.
 *
 * Creates `.filid/config.json` at the git repository root if absent.
 * Rule doc deployment (`.claude/rules/*.md`) is NOT performed here; it is
 * handled exclusively by the `/filid:setup` skill via `syncRuleDocs`.
 *
 * @param projectRoot - Target project directory (git root will be resolved from this)
 * @param options - Output language name and adapter IDs. Both are recorded in
 *   the freshly created config and ignored when the config already exists
 *   (an existing config is never overwritten).
 */
export function initProject(
  projectRoot: string,
  options?: InitProjectOptions,
): InitResult {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const configPath = join(resolvedRoot, CONFIG_DIR, CONFIG_FILE);

  let configCreated = false;
  if (!existsSync(configPath)) {
    writeConfig(
      resolvedRoot,
      'project',
      createDefaultConfig(options?.language, options?.adapterIds),
    );
    configCreated = true;
    log.debug('created default config', configPath);
  }
  return {
    configCreated,
    configMigrated: configCreated
      ? false
      : migrateProjectConfig(resolvedRoot, configPath),
    filePath: { config: configPath },
  };
}

/**
 * Convert an existing v1/v2 config to v3 in place when nothing is lost.
 *
 * The conversion is deterministic, so it needs no decision; a conversion that
 * would drop a key the user wrote is left alone, and the reader keeps
 * reporting `config-migration-required`.
 *
 * @param projectRoot Resolved Git root that owns the config layer.
 * @param configPath Absolute path of the existing config file.
 * @returns Whether the file was rewritten as v3.
 */
function migrateProjectConfig(
  projectRoot: string,
  configPath: string,
): boolean {
  let document: unknown;
  try {
    document = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return false;
  }
  if (
    !document ||
    typeof document !== 'object' ||
    !['1.0', '2.0'].includes(String((document as Record<string, unknown>).version))
  )
    return false;
  const diagnostics: import('./configTypes.js').ConfigDiagnostic[] = [];
  const migrated = normalizeConfigLayer(document as Record<string, unknown>, diagnostics);
  if (diagnostics.some(({ code }) => code === 'config-key-discarded'))
    return false;
  const strict = FilidConfigFileSchema.safeParse(migrated);
  if (!strict.success) return false;
  writeConfig(projectRoot, 'project', strict.data);
  log.debug('migrated config to v3', configPath);
  return true;
}
