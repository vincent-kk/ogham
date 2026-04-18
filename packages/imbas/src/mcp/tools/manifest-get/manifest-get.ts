/**
 * @file manifest-get.ts
 * @description Load manifest with summary
 */

import { getRunDir } from '../../../core/paths/paths.js';
import {
  loadManifest,
  getManifestSummary,
  getImplementPlanSummary,
} from '../../../core/manifest-parser/manifest-parser.js';

export interface ManifestGetInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan' | 'implement-plan';
}

export async function handleManifestGet(input: ManifestGetInput) {
  const cwd = process.cwd();
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
