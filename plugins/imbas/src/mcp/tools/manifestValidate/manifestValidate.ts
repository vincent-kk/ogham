/**
 * @file manifestValidate.ts
 * @description Validate manifest structure
 */
import { projectRoot } from '@ogham/cross-platform/host-paths';

import { validateManifest } from '../../../core/manifestValidator/manifestValidator.js';
import { getRunDir } from '../../../core/paths/paths.js';

export interface ManifestValidateInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan' | 'implement-plan';
  project_root?: string;
}

export async function handleManifestValidate(input: ManifestValidateInput) {
  const cwd = projectRoot(input.project_root);
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  return validateManifest(run_dir, input.type);
}
