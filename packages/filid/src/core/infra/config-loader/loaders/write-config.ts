import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger } from '../../../../lib/logger.js';
import { CONFIG_DIR, CONFIG_FILE } from '../../../../constants/infra-defaults.js';
import { resolveGitRoot } from '../utils/resolve-git-root.js';
import type { FilidConfig } from './config-schemas.js';

const log = createLogger('config-loader');

/** Write .filid/config.json with the given config. Resolves git root and creates .filid/ if needed. */
export function writeConfig(projectRoot: string, config: FilidConfig): void {
  const resolvedRoot = resolveGitRoot(projectRoot);
  const configDir = join(resolvedRoot, CONFIG_DIR);
  mkdirSync(configDir, { recursive: true });
  const configPath = join(configDir, CONFIG_FILE);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  log.debug('config written', configPath);
}
