/**
 * @file manifest-plan.ts
 * @description Execution plan from devplan manifest
 */

import { getRunDir } from '../../../core/paths/paths.js';
import { loadManifest } from '../../../core/manifest-parser/manifest-parser.js';
import { planExecution } from '../../../core/execution-planner/execution-planner.js';

export interface ManifestPlanInput {
  project_ref: string;
  run_id: string;
}

export async function handleManifestPlan(input: ManifestPlanInput) {
  const cwd = process.cwd();
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  const manifest = await loadManifest(run_dir, 'devplan');
  return planExecution(manifest);
}
