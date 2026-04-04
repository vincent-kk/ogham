/**
 * @file run-list.ts
 * @description List runs for a project
 */

import { existsSync, readdirSync } from 'node:fs';

import { loadConfig } from '../../../core/config-manager/config-manager.js';
import { getRunsDir, getRunDir } from '../../../core/paths/paths.js';
import { loadRunState } from '../../../core/state-manager/state-manager.js';

export interface RunListInput {
  project_ref?: string;
}

export async function handleRunList(input: RunListInput) {
  const cwd = process.cwd();

  let project_ref = input.project_ref;
  if (!project_ref) {
    const config = await loadConfig(cwd);
    project_ref = config.defaults.project_ref ?? undefined;
    if (!project_ref) {
      throw new Error('project_ref is required (or set defaults.project_ref in config)');
    }
  }

  const runsDir = getRunsDir(cwd, project_ref);
  if (!existsSync(runsDir)) {
    return { runs: [] };
  }

  const entries = readdirSync(runsDir).sort();
  const runs = [];

  for (const run_id of entries) {
    const run_dir = getRunDir(cwd, project_ref, run_id);
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
