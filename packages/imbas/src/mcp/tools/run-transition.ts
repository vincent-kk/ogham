/**
 * @file run-transition.ts
 * @description Typed phase transition (start/complete/escape)
 */

import { getRunDir } from '../../core/paths.js';
import { loadRunState, saveRunState, applyTransition } from '../../core/state-manager.js';
import type { RunTransition } from '../../types/state.js';

export async function handleRunTransition(input: RunTransition) {
  const cwd = process.cwd();
  const run_dir = getRunDir(cwd, input.project_ref, input.run_id);

  const state = await loadRunState(run_dir);
  const updated = applyTransition(state, input);
  await saveRunState(run_dir, updated);

  return updated;
}
