/**
 * @file run-get.ts
 * @description Read state.json for a run
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { loadConfig } from '../../core/config-manager.js';
import { getRunDir, getProjectDir } from '../../core/paths.js';
import { loadRunState } from '../../core/state-manager.js';

export interface RunGetInput {
  project_key?: string;
  run_id?: string;
}

export async function handleRunGet(input: RunGetInput) {
  const cwd = process.cwd();

  let project_key = input.project_key;
  if (!project_key) {
    const config = await loadConfig(cwd);
    project_key = config.defaults.project_key ?? undefined;
    if (!project_key) {
      throw new Error('project_key is required (or set defaults.project_key in config)');
    }
  }

  let run_id = input.run_id;
  if (!run_id) {
    const runsDir = join(getProjectDir(cwd, project_key), 'runs');
    if (!existsSync(runsDir)) {
      throw new Error(`No runs directory found for project: ${project_key}`);
    }
    const entries = readdirSync(runsDir).sort();
    if (entries.length === 0) {
      throw new Error(`No runs found for project: ${project_key}`);
    }
    run_id = entries[entries.length - 1]!;
  }

  const run_dir = getRunDir(cwd, project_key, run_id);
  const state = await loadRunState(run_dir);

  const manifests_available: string[] = [];
  for (const filename of ['stories-manifest.json', 'devplan-manifest.json']) {
    if (existsSync(join(run_dir, filename))) {
      manifests_available.push(filename.replace('-manifest.json', ''));
    }
  }

  return { state, run_dir, manifests_available };
}
