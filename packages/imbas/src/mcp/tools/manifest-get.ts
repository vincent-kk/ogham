/**
 * @file manifest-get.ts
 * @description Load manifest with summary
 */

import { getRunDir } from '../../core/paths.js';
import { loadManifest, getManifestSummary } from '../../core/manifest-parser.js';

export interface ManifestGetInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan';
}

export async function handleManifestGet(input: ManifestGetInput) {
  const cwd = process.cwd();
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  const manifest = input.type === 'stories'
    ? await loadManifest(run_dir, 'stories')
    : await loadManifest(run_dir, 'devplan');
  const summary = getManifestSummary(manifest);

  return { manifest, summary };
}
