/**
 * @file manifestParser.ts
 * @description Manifest loading + summary generation
 * @see .metadata/imbas/storage.md §4, .metadata/imbas/estimation.md §2.1
 */
import { join } from 'node:path';

import { MANIFEST_FILE_MAP } from '../../constants/index.js';
import { readJson } from '../../lib/fileIo.js';
import {
  EstimationManifestSchema,
  StoriesManifestSchema,
} from '../../types/manifest.js';
import type {
  EstimationManifest,
  EstimationSummary,
  ManifestSummary,
  ManifestType,
  StoriesManifest,
} from '../../types/manifest.js';

export type { ManifestType } from '../../types/manifest.js';

/** Load and validate a manifest file from runDir */
export async function loadManifest(
  runDir: string,
  type: 'stories',
): Promise<StoriesManifest>;
export async function loadManifest(
  runDir: string,
  type: 'estimation',
): Promise<EstimationManifest>;
export async function loadManifest(
  runDir: string,
  type: ManifestType,
): Promise<StoriesManifest | EstimationManifest> {
  const filename = MANIFEST_FILE_MAP[type];
  const filePath = join(runDir, filename);

  if (type === 'stories') {
    const raw = await readJson(filePath, StoriesManifestSchema);
    return raw as StoriesManifest;
  }
  const raw = await readJson(filePath, EstimationManifestSchema);
  return raw as EstimationManifest;
}

/** Generate a ManifestSummary from a loaded stories manifest */
export function getManifestSummary(manifest: StoriesManifest): ManifestSummary {
  const statuses = manifest.stories.map((s) => s.status);
  return {
    total: statuses.length,
    pending: statuses.filter((s) => s === 'pending').length,
    created: statuses.filter((s) => s === 'created').length,
    failed: statuses.filter((s) => s === 'failed').length,
  };
}

/** Generate a summary from a loaded estimation manifest */
export function getEstimationSummary(
  manifest: EstimationManifest,
): EstimationSummary {
  return {
    units: manifest.units.length,
    sum_expected: manifest.rollup.sum_expected,
    buffered_total: manifest.rollup.buffered_total,
    total_weeks: manifest.schedule.total_weeks,
  };
}
