/**
 * @file manifest-save.ts
 * @description Save manifest (full replace)
 */

import { join } from 'node:path';

import { getRunDir } from '../../core/paths.js';
import { getManifestSummary } from '../../core/manifest-parser.js';
import { writeJson } from '../../lib/file-io.js';
import { MANIFEST_FILE_MAP } from '../../constants/index.js';
import { StoriesManifestSchema, DevplanManifestSchema } from '../../types/manifest.js';

export interface ManifestSaveInput {
  project_ref: string;
  run_id: string;
  type: 'stories' | 'devplan';
  manifest?: unknown;
}

export async function handleManifestSave(input: ManifestSaveInput) {
  const cwd = process.cwd();
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  if (input.manifest === undefined) {
    throw new Error('manifest is required');
  }
  const filename = MANIFEST_FILE_MAP[input.type];
  const path = join(run_dir, filename);

  if (input.type === 'stories') {
    const validated = StoriesManifestSchema.parse(input.manifest);
    await writeJson(path, validated);
    return { path, summary: getManifestSummary(validated) };
  }

  const validated = DevplanManifestSchema.parse(input.manifest);
  await writeJson(path, validated);
  const summary = getManifestSummary(validated);

  return { path, summary };
}
