/**
 * @file manifestSave.ts
 * @description Save manifest (full replace)
 */
import { join } from 'node:path';

import { projectRoot } from '@ogham/cross-platform';

import { MANIFEST_FILE_MAP } from '../../../constants/index.js';
import {
  getEstimationSummary,
  getManifestSummary,
} from '../../../core/manifestParser/index.js';
import { getRunDir } from '../../../core/paths/index.js';
import { writeJson } from '../../../lib/fileIo.js';
import {
  EstimationManifestSchema,
  StoriesManifestSchema,
} from '../../../types/manifest.js';

export interface ManifestSaveInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'estimation';
  manifest?: unknown;
  project_root?: string;
}

export async function handleManifestSave(input: ManifestSaveInput) {
  const cwd = projectRoot(input.project_root);
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  if (input.manifest === undefined) throw new Error('manifest is required');

  const filename = MANIFEST_FILE_MAP[input.type];
  const path = join(run_dir, filename);

  if (input.type === 'stories') {
    const validated = StoriesManifestSchema.parse(input.manifest);
    await writeJson(path, validated);
    return { path, summary: getManifestSummary(validated) };
  }

  const validated = EstimationManifestSchema.parse(input.manifest);
  await writeJson(path, validated);
  return { path, summary: getEstimationSummary(validated) };
}
