/**
 * @file core/state-manager.ts
 * @description State.json CRUD + transition validation
 * @see skills/imbas-validate/references/state-transitions.md, skills/imbas-split/references/state-transitions.md
 */

import { join } from 'node:path';
import { readJson, writeJson } from '../../lib/file-io.js';
import { STATE_FILENAME } from '../../constants/index.js';
import {
  RunStateSchema,
  createInitialRunState,
} from '../../types/state.js';
import type { RunState, RunTransition } from '../../types/state.js';
import { validateStartPhase } from '../utils/validate-start-phase.js';
import { handleCompletePhase } from '../utils/handle-complete-phase.js';
import { advancePhase } from '../utils/advance-phase.js';

/** Create a new initial RunState (delegates to factory in types) */
export function createRunState(params: {
  run_id: string;
  project_ref: string;
  source_file: string;
}): RunState {
  return createInitialRunState(params);
}

/** Load and validate state.json from runDir */
export async function loadRunState(runDir: string): Promise<RunState> {
  return readJson(join(runDir, STATE_FILENAME), RunStateSchema);
}

/** Atomically write state.json to runDir */
export async function saveRunState(runDir: string, state: RunState): Promise<void> {
  await writeJson(join(runDir, STATE_FILENAME), state);
}

/** Apply a validated transition to the state, returning the new state */
export function applyTransition(state: RunState, action: RunTransition): RunState {
  const now = new Date().toISOString();

  switch (action.action) {
    case 'start_phase': {
      validateStartPhase(state, action.phase);
      const updated = structuredClone(state);
      updated.current_phase = action.phase;
      updated.phases[action.phase].status = 'in_progress';
      updated.phases[action.phase].started_at = now;
      updated.updated_at = now;
      return updated;
    }

    case 'complete_phase': {
      return handleCompletePhase(state, action, now);
    }

    case 'escape_phase': {
      const phase = action.phase; // always 'split'
      if (state.phases[phase].status !== 'in_progress') {
        throw new Error(
          `Cannot escape phase "${phase}": current status is "${state.phases[phase].status}", expected "in_progress"`,
        );
      }
      const updated = structuredClone(state);
      updated.phases.split.status = 'escaped';
      updated.phases.split.completed_at = now;
      updated.phases.split.escape_code = action.escape_code;
      updated.updated_at = now;
      return updated;
    }

    case 'skip_phases': {
      const updated = structuredClone(state);
      for (const phase of action.phases) {
        updated.phases[phase].status = 'completed';
        updated.phases[phase].completed_at = now;
        if (phase === 'validate') {
          updated.phases.validate.result = 'PASS';
          updated.phases.validate.blocking_issues = 0;
          updated.phases.validate.warning_issues = 0;
        }
        if (phase === 'split') {
          updated.phases.split.pending_review = false;
          updated.phases.split.stories_created = 0;
        }
      }
      const lastSkipped = action.phases[action.phases.length - 1]!;
      updated.current_phase = advancePhase(lastSkipped);
      updated.metadata = { ...updated.metadata, skipped_phases: action.phases };
      updated.updated_at = now;
      return updated;
    }

    default: {
      const _exhaustive: never = action;
      throw new Error(`Unknown action: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
