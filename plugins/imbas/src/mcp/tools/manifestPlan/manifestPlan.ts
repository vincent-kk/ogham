/**
 * @file manifestPlan.ts
 * @description Execution plan from devplan manifest
 */
import { projectRoot } from '@ogham/cross-platform/host-paths';

import { planExecution } from '../../../core/executionPlanner/executionPlanner.js';
import { loadManifest } from '../../../core/manifestParser/manifestParser.js';
import { getRunDir } from '../../../core/paths/paths.js';

export interface ManifestPlanInput {
  project_ref: string;
  run_id: string;
  project_root?: string;
}

export async function handleManifestPlan(input: ManifestPlanInput) {
  const cwd = projectRoot(input.project_root);
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  const manifest = await loadManifest(run_dir, 'devplan');
  return planExecution(manifest);
}
