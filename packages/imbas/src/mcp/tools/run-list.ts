/**
 * @file run-list.ts
 * @description List runs for a project
 */

import { existsSync, readdirSync } from 'node:fs';

import { loadConfig } from '../../core/config-manager.js';
import { getRunsDir, getRunDir } from '../../core/paths.js';
import { loadRunState } from '../../core/state-manager.js';

export interface RunListInput {
  project_key?: string;
}

export async function handleRunList(input: RunListInput) {
  const cwd = process.cwd();

  let project_key = input.project_key;
  if (!project_key) {
    const config = await loadConfig(cwd);
    project_key = config.defaults.project_key ?? undefined;
    if (!project_key) {
      throw new Error('project_key is required (or set defaults.project_key in config)');
    }
  }

  const runsDir = getRunsDir(cwd, project_key);
  if (!existsSync(runsDir)) {
    return { runs: [] };
  }

  const entries = readdirSync(runsDir).sort();
  const runs = [];

  for (const run_id of entries) {
    const run_dir = getRunDir(cwd, project_key, run_id);
    try {
      const state = await loadRunState(run_dir);
      runs.push({
        run_id,
        run_dir,
        current_phase: state.current_phase,
        created_at: state.created_at,
        updated_at: state.updated_at,
      });
    } catch {
      runs.push({ run_id, run_dir, error: 'failed to load state' });
    }
  }

  return { runs };
}
