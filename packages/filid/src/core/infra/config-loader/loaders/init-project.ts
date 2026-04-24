import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { CONFIG_DIR, CONFIG_FILE } from '../../../../constants/infra-defaults.js';
import { resolveGitRoot } from '../utils/resolve-git-root.js';
import { createDefaultConfig } from './create-default-config.js';
import type { InitResult } from './config-types.js';
import { writeConfig } from './write-config.js';

const log = createLogger('config-loader');

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
