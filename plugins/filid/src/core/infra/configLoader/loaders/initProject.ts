import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  CONFIG_DIR,
  CONFIG_FILE,
} from '../../../../constants/infraDefaults.js';
import { createLogger } from '../../../../lib/logger.js';
import { resolveGitRoot } from '../utils/resolveGitRoot.js';

import type { InitProjectOptions, InitResult } from './configTypes.js';
import { createDefaultConfig } from './createDefaultConfig.js';
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
    filePath: { config: configPath },
  };
}
