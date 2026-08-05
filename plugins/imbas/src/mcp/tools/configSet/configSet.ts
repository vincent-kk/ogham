/**
 * @file configSet.ts
 * @description Update config.json fields
 */
import { projectRoot } from '@ogham/cross-platform';

import { updateConfigLayer } from '../../../core/configManager/index.js';

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
  // Updates land in the named layer's own document only — values inherited
  // from the other layer never bake into the file, so later user-layer edits
  // keep flowing into this workspace.
  return updateConfigLayer(cwd, input.scope, input.updates);
}
