/**
 * @file manifestValidate.ts
 * @description Validate manifest structure
 */
import { validateManifest } from '../../../core/manifestValidator/manifestValidator.js';
import { getRunDir } from '../../../core/paths/paths.js';

export interface ManifestValidateInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan' | 'implement-plan';
}

export async function handleManifestValidate(input: ManifestValidateInput) {
  const cwd = process.cwd();
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  return validateManifest(run_dir, input.type);
}
