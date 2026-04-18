/**
 * @file manifest-implement-plan.ts
 * @description Build ImplementPlanManifest from stories/devplan and persist
 */

import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

import { getRunDir } from '../../../core/paths/paths.js';
import { loadManifest } from '../../../core/manifest-parser/manifest-parser.js';
import {
  buildImplementPlan,
  renderImplementPlanReport,
} from '../../../core/implement-planner/index.js';
import { writeJson } from '../../../lib/file-io.js';
import {
  MANIFEST_FILE_MAP,
  REPORT_FILE_MAP,
} from '../../../constants/index.js';

export interface ManifestImplementPlanInput {
  project_ref: string;
  run_id: string;
  batch?: string;
  source?: 'stories' | 'devplan';
  max_parallel?: number;
}

export async function handleManifestImplementPlan(
  input: ManifestImplementPlanInput,
) {
  const cwd = process.cwd();
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);
  const source = input.source ?? 'devplan';

  const stories = await loadManifest(run_dir, 'stories');
  const devplan =
    source === 'devplan' ? await loadManifest(run_dir, 'devplan') : null;

  const result = buildImplementPlan({
    run_id: input.run_id,
    project_ref: input.project_ref,
    batch: input.batch ?? stories.batch,
    source,
    stories,
    devplan,
    max_parallel: input.max_parallel,
  });

  const manifestPath = join(run_dir, MANIFEST_FILE_MAP['implement-plan']);
  await writeJson(manifestPath, result.manifest);

  const reportPath = join(run_dir, REPORT_FILE_MAP['implement-plan']);
  writeFileSync(reportPath, renderImplementPlanReport(result.manifest), 'utf-8');

  return {
    manifest_path: manifestPath,
    report_path: reportPath,
    manifest: result.manifest,
    summary: {
      total_groups: result.manifest.groups.length,
      total_items: result.manifest.groups.reduce(
        (sum, g) => sum + g.items.length,
        0,
      ),
      max_level: result.manifest.groups.length
        ? Math.max(...result.manifest.groups.map((g) => g.level))
        : 0,
      unresolved: result.manifest.unresolved.length,
      cycles_broken: result.manifest.cycles_broken.length,
      degraded: result.manifest.degraded,
    },
  };
}
