/**
 * @file runList.ts
 * @description List runs for a project
 */
import { existsSync, readdirSync } from 'node:fs';

import { projectRoot } from '@ogham/cross-platform';

import { loadConfig } from '../../../core/configManager/index.js';
import { getRunDir, getRunsDir } from '../../../core/paths/index.js';
import { sortRunIds } from '../../../core/runIdGenerator/index.js';
import { loadRunState } from '../../../core/stateManager/index.js';

/** Optional workspace and project selectors for an ordered run listing. */
export interface RunListInput {
  /** Project reference, or the configured default when omitted. */
  project_ref?: string;
  /** Absolute workspace root when the host is not running in the workspace. */
  project_root?: string;
}

/**
 * List valid run IDs in date and numeric order, retaining per-run state errors.
 * @param input Optional workspace and project selectors.
 * @returns Ordered run summaries or an empty list when no runs exist.
 * @throws If project resolution or listing fails; state failures stay in the list.
 */
export async function handleRunList(input: RunListInput) {
  const cwd = projectRoot(input.project_root);

  let project_ref = input.project_ref;
  if (!project_ref) {
    const config = await loadConfig(cwd);
    project_ref = config.defaults.project_ref ?? undefined;
    if (!project_ref)
      throw new Error(
        'project_ref is required (or set defaults.project_ref in config)',
      );
  }

  const runsDir = getRunsDir(cwd, project_ref);
  if (!existsSync(runsDir)) return { runs: [] };

  const entries = sortRunIds(readdirSync(runsDir));
  const runs = [];

  for (const run_id of entries) {
    const run_dir = getRunDir(cwd, project_ref, run_id);
    try {
      const state = await loadRunState(run_dir);
      const phase = state.phases[state.current_phase];
      // A phase completed with result BLOCKED holds the run in place — report
      // 'blocked' so the listing does not read as a normal completion.
      const status =
        phase.status === 'completed' &&
        'result' in phase &&
        phase.result === 'BLOCKED'
          ? 'blocked'
          : phase.status;
      runs.push({
        run_id,
        run_dir,
        current_phase: state.current_phase,
        status,
        created_at: state.created_at,
        updated_at: state.updated_at,
      });
    } catch {
      runs.push({ run_id, run_dir, error: 'failed to load state' });
    }
  }

  return { runs };
}
