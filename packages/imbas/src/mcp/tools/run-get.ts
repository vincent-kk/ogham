/**
 * @file run-get.ts
 * @description Read state.json for a run
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { loadConfig } from '../../core/config-manager.js';
import { getRunDir, getRunsDir } from '../../core/paths.js';
import { loadRunState } from '../../core/state-manager.js';
import { MANIFEST_FILE_MAP } from '../../constants/index.js';

export interface RunGetInput {
  project_ref?: string;
  run_id?: string;
}

export async function handleRunGet(input: RunGetInput) {
  const cwd = process.cwd();

  let project_ref = input.project_ref;
  if (!project_ref) {
    const config = await loadConfig(cwd);
    project_ref = config.defaults.project_ref ?? undefined;
    if (!project_ref) {
      throw new Error('project_ref is required (or set defaults.project_ref in config)');
    }
  }

  let run_id = input.run_id;
  if (!run_id) {
    const runsDir = getRunsDir(cwd, project_ref);
    if (!existsSync(runsDir)) {
      throw new Error(`No runs directory found for project: ${project_ref}`);
    }
    const entries = readdirSync(runsDir).sort();
    if (entries.length === 0) {
      throw new Error(`No runs found for project: ${project_ref}`);
    }
    run_id = entries[entries.length - 1]!;
  }

  const run_dir = getRunDir(cwd, project_ref, run_id);
  const state = await loadRunState(run_dir);

  const manifests_available: string[] = [];
  for (const [key, filename] of Object.entries(MANIFEST_FILE_MAP)) {
    if (existsSync(join(run_dir, filename))) {
      manifests_available.push(key);
    }
  }

  return { state, run_dir, manifests_available };
}
