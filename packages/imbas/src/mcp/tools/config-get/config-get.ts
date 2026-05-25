/**
 * @file config-get.ts
 * @description Read config.json
 */
import {
  getConfigValue,
  loadConfig,
} from '../../../core/config-manager/config-manager.js';

export interface ConfigGetInput {
  field?: string;
}

export async function handleConfigGet(input: ConfigGetInput) {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  if (input.field) {
    return { field: input.field, value: getConfigValue(config, input.field) };
  }

  return config;
}
