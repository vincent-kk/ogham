/**
 * @file configSet.ts
 * @description Update config.json fields
 */
import { projectRoot } from '@ogham/cross-platform/host-paths';

import {
  applyConfigUpdates,
  loadConfig,
  saveConfig,
} from '../../../core/configManager/index.js';

export interface ConfigSetInput {
  updates: Record<string, unknown>;
  /**
   * Which layer to write. Required: both are valid targets, and a silent
   * default would put a project decision in the user file or the reverse.
   */
  scope: 'user' | 'project';
  project_root?: string;
}

export async function handleConfigSet(input: ConfigSetInput) {
  const cwd = projectRoot(input.project_root);
  // Updates apply to the effective config, then land in the named layer —
  // which means writing to `user` while a project layer overrides a field
  // records the merged value. That is the same thing the settings page does.
  const config = await loadConfig(cwd);
  const updated = applyConfigUpdates(config, input.updates);
  await saveConfig(cwd, input.scope, updated);
  return updated;
}
