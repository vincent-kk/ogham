/**
 * @file configGet.ts
 * @description Read config.json
 */
import { projectRoot } from '@ogham/cross-platform/host-paths';

import {
  getConfigValue,
  loadConfig,
} from '../../../core/configManager/configManager.js';

export interface ConfigGetInput {
  field?: string;
  project_root?: string;
}

export async function handleConfigGet(input: ConfigGetInput) {
  const cwd = projectRoot(input.project_root);
  const config = await loadConfig(cwd);

  if (input.field)
    return { field: input.field, value: getConfigValue(config, input.field) };

  return config;
}
