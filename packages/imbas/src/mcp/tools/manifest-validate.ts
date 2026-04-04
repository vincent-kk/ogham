/**
 * @file manifest-validate.ts
 * @description Validate manifest structure
 */

import { getRunDir } from '../../core/paths.js';
import { validateManifest } from '../../core/manifest-validator.js';

export interface ManifestValidateInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan';
}

export async function handleManifestValidate(input: ManifestValidateInput) {
  const cwd = process.cwd();
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  return validateManifest(run_dir, input.type);
}
