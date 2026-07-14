/**
 * @file configSet.ts
 * @description Update config.json fields
 */
import { projectRoot } from '@ogham/cross-platform/host-paths';

import {
  applyConfigUpdates,
  loadConfig,
  saveConfig,
} from '../../../core/configManager/configManager.js';

export interface ConfigSetInput {
  updates: Record<string, unknown>;
  project_root?: string;
}

export async function handleConfigSet(input: ConfigSetInput) {
  const cwd = projectRoot(input.project_root);
  const config = await loadConfig(cwd);
  const updated = applyConfigUpdates(config, input.updates);
  await saveConfig(cwd, updated);
  return updated;
}
