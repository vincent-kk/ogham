/**
 * @file manifestGet.ts
 * @description Load manifest with summary
 */
import { projectRoot } from '@ogham/cross-platform/host-paths';

import {
  getImplementPlanSummary,
  getManifestSummary,
  loadManifest,
} from '../../../core/manifestParser/manifestParser.js';
import { getRunDir } from '../../../core/paths/paths.js';

export interface ManifestGetInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan' | 'implement-plan';
  project_root?: string;
}

export async function handleManifestGet(input: ManifestGetInput) {
  const cwd = projectRoot(input.project_root);
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  if (input.type === 'stories') {
    const manifest = await loadManifest(run_dir, 'stories');
    return { manifest, summary: getManifestSummary(manifest) };
  }
  if (input.type === 'devplan') {
    const manifest = await loadManifest(run_dir, 'devplan');
    return { manifest, summary: getManifestSummary(manifest) };
  }
  const manifest = await loadManifest(run_dir, 'implement-plan');
  return { manifest, summary: getImplementPlanSummary(manifest) };
}
